import type {User} from "./Home"


interface FooterProps {
    currUser: User;
    users: User[];
    loading: boolean;
}
export default function Footer(props: FooterProps) {
    const {currUser, users, loading} = props;
    return(
        <div className="space-x-2 overflow-x-scroll flex justify-between bg-black w-full h-44 items-center px-6 text-neutral-200">
        <span className="text-nowrap">{loading ? "" : "The Garden of Earthly Delights by Heironymous Bosch."}</span>
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
    )
}
