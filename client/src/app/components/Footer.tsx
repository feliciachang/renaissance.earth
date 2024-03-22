import type { User, } from "../utils/types";
import { useState } from "react";

interface FooterProps {
  currUser: User;
  users: User[];
  loading: boolean;
}
export default function Footer(props: FooterProps) {
  const { currUser, users, loading } = props;
  return (
    <div className= "h-44 bg-black w-full py-4 pl-6 pr-2 text-neutral-200 space-x-2 flex justify-between items-start">
      <div>
      <div className="text-nowrap">
        {loading ? "" : "The Garden of Earthly Delights by Heironymous Bosch."}
      </div>
      <a href="https://github.com/feliciachang/renaissance.earth" className="text-xs text-neutral-300">Learn more about this project</a>
      </div>
      <div className="flex space-x-2 items center">
        <div
          className="rounded-full w-6 h-6"
          style={{ backgroundColor: currUser.color }}
        />
        {users.map((user) => (
          <div
            key={user.id}
            className="rounded-full w-6 h-6"
            style={{ backgroundColor: user.color }}
          />
        ))}
      </div>
      </div>
  );
}
