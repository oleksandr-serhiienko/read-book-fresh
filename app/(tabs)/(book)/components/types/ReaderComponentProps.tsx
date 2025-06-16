import { Section, Location } from "@/components/epub";
import { ResponseTranslation, SentenceTranslation } from "@/components/reverso/reverso";

export interface ReaderComponentProps {
    bookUrl: string;
    bookTitle: string;
    imageUrl: string;
    initialLocation: string | undefined;
    onLocationChange: (
      totalLocations: number,
      currentLocation: Location,
      progress: number,
      currentSection: Section | null
    ) => void;
    setPanelContent: React.Dispatch<React.SetStateAction<SentenceTranslation | ResponseTranslation | null>>;
    setIsPanelVisible: React.Dispatch<React.SetStateAction<boolean>>;
    onAnnotateSentenceRef: React.MutableRefObject<(() => void) | undefined>;
  }