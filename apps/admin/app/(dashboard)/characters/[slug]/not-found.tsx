import Link from "next/link";
import { UserX } from "lucide-react";
import { EmptyState } from "@/components/states/EmptyState";
import { Button } from "@/components/ui/button";

export default function CharacterNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <EmptyState
        icon={UserX}
        title="Character not found"
        description="There's no character with this slug. It may have been archived, or the link is out of date."
        action={
          <Link href="/characters">
            <Button size="sm" variant="secondary">
              Back to Characters
            </Button>
          </Link>
        }
      />
    </div>
  );
}
