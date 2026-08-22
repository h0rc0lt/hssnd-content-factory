import { NewCharacterForm } from "@/components/characters/NewCharacterForm";

export default function NewCharacterPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-paper">New character</h1>
        <p className="mt-1 text-sm text-mist">
          Add a character record and its initial reference images. LoRA training is a
          separate step, started explicitly once uploads are in.
        </p>
      </div>

      <NewCharacterForm />
    </div>
  );
}
