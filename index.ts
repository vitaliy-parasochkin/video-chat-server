import express, { Application } from "express";
import cors from "cors";
import { Server } from "socket.io";
import { ClientToServerEvents, KeyValue, ServerToClientEvents } from "./types";

const PORT = process.env.PORT || 8080;
const app: Application = express();

app.use(cors());

const expressServer = app.listen(PORT, () => {
  console.log(`Listening port ${PORT}`);
});

const io = new Server<ClientToServerEvents, ServerToClientEvents>(
  expressServer,
  {
    cors: {
      origin: [process.env.CLIENT_URL || "http://localhost:3000"],
      methods: ["GET", "POST"],
    },
  },
);

const meetings: KeyValue<{
  ownerId: string;
  ownerSocketId: string;
  members: number;
  requestsCount: number;
}> = {};

io.on("connection", (socket) => {
  socket.on("user:join-request", ({ code, user, ownerId }) => {
    if (
      meetings[code]?.members >= 9 ||
      meetings[code]?.members + meetings[code]?.requestsCount >= 9 ||
      meetings[code]?.requestsCount >= 9
    ) {
      return socket.emit("meeting:full");
    }

    if (user.id === ownerId) {
      if (!meetings[code]?.members) {
        meetings[code] = {
          ownerSocketId: socket.id,
          ownerId: ownerId,
          members: 1,
          requestsCount: 0,
        };
      } else {
        meetings[code].members = meetings[code].members + 1;
      }
      return socket.emit("user:accepted", { code, user });
    }

    if (!meetings[code]?.ownerId || !meetings[code]?.ownerSocketId) {
      return socket.emit("user:wait-for-owner");
    }

    meetings[code].requestsCount = meetings[code].requestsCount + 1;

    io.to(meetings[code].ownerSocketId).emit("user:join-request", {
      ...user,
      socketId: socket.id,
    });
  });
  socket.on("user:accepted", ({ code, user }) => {
    meetings[code].members = meetings[code].members + 1;
    meetings[code].requestsCount = meetings[code].requestsCount - 1;
    io.to(user.socketId).emit("user:accepted", { code, user });
  });
  socket.on("user:rejected", ({ code, user }) => {
    meetings[code].requestsCount = meetings[code].requestsCount - 1;
    io.to(user.socketId).emit("user:rejected", { code, user });
  });
  socket.on("meeting:join", ({ code, user }) => {
    socket.join(code);
    socket.to(code).emit("user:joined", user);

    socket.on("user:toggle-audio", (userPeerId) => {
      socket.to(code).emit("user:toggle-audio", userPeerId);
    });

    socket.on("user:toggle-video", (userPeerId) => {
      socket.to(code).emit("user:toggle-video", userPeerId);
    });

    socket.on("disconnect", (data) => {
      if (meetings[code]?.ownerSocketId === socket.id) {
        meetings[code].ownerId = "";
        meetings[code].ownerSocketId = "";
      }

      if (meetings[code]?.members <= 1) {
        delete meetings[code];
      } else {
        meetings[code].members = meetings[code]?.members - 1 || 0;
      }

      socket.to(code).emit("user:left", user.peerId);
    });
  });
});

app.get("*", (req, res) => {
  res.redirect(process.env.CLIENT_URL || "https://localhost:3000");
});
