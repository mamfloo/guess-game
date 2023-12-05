"use client";

import JoinPage from "./_components/(joinPage)/JoinPage";
import { SocketProvider } from "./_components/SocketProvider";

export default function page() {

  return (
    <SocketProvider>
      <JoinPage />
    </SocketProvider>
  );
}