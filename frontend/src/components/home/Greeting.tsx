import { Avatar } from '../ui/Avatar';
import { greetingFor } from '../../lib/strings';

// "Good morning, Juan" with a name-colored initials avatar. Without a name the
// greeting stands alone and the avatar uses the address initials.
export function Greeting({ address, name }: { address: string; name?: string }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar addr={address} name={name} size="md" />
      <h1 className="text-[20px] font-bold tracking-tight text-ink">{greetingFor(new Date(), name)}</h1>
    </div>
  );
}
