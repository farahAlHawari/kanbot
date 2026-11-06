const englishText = (text: string) => text;

export function useLocale() {
  return { t: englishText };
}
