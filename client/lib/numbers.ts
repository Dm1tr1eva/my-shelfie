export function isWholeIn(text: string, min: number, max: number) {
  const value = Number(text);
  return text.trim() !== "" && Number.isInteger(value) && value >= min && value <= max;
}
