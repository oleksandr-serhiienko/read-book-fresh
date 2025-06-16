import { useLanguage } from "@/app/languageSelector";
import { Card, Word, Translation as CardTranslation, Example, cardHelpers } from "./db/database";
import { ResponseTranslation } from "./reverso/reverso";
import Translation from "./reverso/languages/entities/translation";
import TranslationContext from "./reverso/languages/entities/translationContext";

export class Transform {
    static fromWordToCard(word: ResponseTranslation, sourceLanguage: string, targetLanguage: string): Card {
        const context = word.Contexts.filter(c => c.original.length < 100).slice(0, 5);
        
        // Create the Word structure
        const wordInfo: Word = {
            name: word.Original,
            baseForm: '',
            additionalInfo: '',
            translations: word.Translations.slice(0, 5).map((t, index) => {
                const cardTranslation: CardTranslation = {
                    type: '',
                    meaning: t.word,
                    additionalInfo: '',
                    examples: []
                };
                
                // Add corresponding context as example if it exists
                if (index < context.length) {
                    cardTranslation.examples!.push({
                        sentence: context[index].original,
                        translation: context[index].translation
                    });
                }
                
                return cardTranslation;
            })
        };
        
        // Distribute remaining contexts to the last translation if there are more contexts than translations
        if (context.length > wordInfo.translations!.length && wordInfo.translations!.length > 0) {
            const lastTranslation = wordInfo.translations![wordInfo.translations!.length - 1];
            for (let i = wordInfo.translations!.length; i < context.length; i++) {
                lastTranslation.examples!.push({
                    sentence: context[i].original,
                    translation: context[i].translation
                });
            }
        }
        
        const card: Card = {
            level: 0,
            sourceLanguage,
            targetLanguage,
            source: word.Book ?? 'Unknown',
            word: word.Original,
            wordInfo: wordInfo,
            userId: 'test', 
            comment: "",
            lastRepeat: new Date(),
            info: {
                status: 'learning',
                learningProgress: {
                    wordToMeaning: 0,
                    meaningToWord: 0,
                    context: 0,
                    contextLetters: 0
                },
                sentence: word.TextView || ""
            }
        };
        return card;
    }

    static fromCardToWord(card: Card): ResponseTranslation {
        const allMeanings = cardHelpers.getAllMeanings(card);
        const allExamples = cardHelpers.getAllExamples(card);
        
        const word: ResponseTranslation = {
            Book: card.source,
            Original: card.word,
            Translations: allMeanings.map(meaning => ({ word: meaning } as Translation)),
            Contexts: allExamples.map(example => ({
                original: example.sentence || '',
                translation: example.translation || ''
            } as TranslationContext)),
            TextView: card.info?.sentence ?? ""
        };
        return word;
    }
}