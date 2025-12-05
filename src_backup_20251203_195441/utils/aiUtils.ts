export const extractJSON = (text: string): any => {
  if (!text) return {};

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');

  if (start === -1 || end === -1) {
      // Silent fail - usually just chatty AI
      return {}; 
  }

  let clean = text.substring(start, end + 1);

  try {
    return JSON.parse(clean);
  } catch (e) {
    try {
        // Repairs
        clean = clean.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
        clean = clean.replace(/\n/g, ' ');
        return JSON.parse(clean);
    } catch (e2) {
        return {};
    }
  }
};
