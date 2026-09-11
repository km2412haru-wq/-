import { POS_CLASS, POS_LABEL } from "@/lib/partOfSpeech";
import type { PartOfSpeech } from "@/types/word";

export default function PosBadge({ partOfSpeech }: { partOfSpeech: PartOfSpeech }) {
  return (
    <span className={`pos-badge ${POS_CLASS[partOfSpeech]}`}>
      {POS_LABEL[partOfSpeech]}
    </span>
  );
}
