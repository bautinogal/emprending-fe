export const lerp = (start: number, end: number, amount: number): number => {
    return start * (1 - amount) + end * amount;
}

export const mulberry32 = (seed: number) => {
    return function () {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        let res = ((t ^ t >>> 14) >>> 0) / 4294967296;
        return res;
    };
};

export const hashArray = (arr: number[] | [number[], number[], number[]]): string => {
    return arr.flat().join(',');
};

export const shuffleArray = <T>(array: T[], seed: number): T[] => {
    const random = mulberry32(seed);
    const result = [...array];

    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
};

export const normalizeName = (name: string) => {
    if (!name) return '';
    return name.toLowerCase()
        .replace(/á/g, 'a')
        .replace(/é/g, 'e')
        .replace(/í/g, 'i')
        .replace(/ó/g, 'o')
        .replace(/ú/g, 'u')
        .replace(/ñ/g, 'n')
        .replace(/\s+/g, ' ')
        .trim();
};

export const calculateSimilarity = (str1: string, str2: string): number => {
    const levenshteinDistance = (str1: string, str2: string): number => {
        const m = str1.length;
        const n = str2.length;
        const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;

        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (str1[i - 1] === str2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    dp[i][j] = Math.min(
                        dp[i - 1][j] + 1,    // deletion
                        dp[i][j - 1] + 1,    // insertion
                        dp[i - 1][j - 1] + 1 // substitution
                    );
                }
            }
        }
        return dp[m][n];
    };

    if (!str1 || !str2) return 0;

    const normalizedStr1 = normalizeName(str1);
    const normalizedStr2 = normalizeName(str2);

    // Exact match after normalization
    if (normalizedStr1 === normalizedStr2) return 1.0;

    // Check for abbreviation match first (higher priority than Levenshtein)
    // const parts1 = normalizedStr1.split(' ');
    // const parts2 = normalizedStr2.split(' ');
    // if (parts1.length >= 2 && parts2.length >= 2) {
    //   const lastNameMatch = parts1[parts1.length - 1] === parts2[parts2.length - 1];
    //   const firstInitialMatch = parts1[0].charAt(0) === parts2[0].charAt(0);
    //   if (lastNameMatch && parts1[0].length <= 2 && firstInitialMatch) {
    //     return 0.95; // High similarity for abbreviations
    //   }
    // }

    // Calculate Levenshtein similarity for other cases
    const maxLen = Math.max(normalizedStr1.length, normalizedStr2.length);
    if (maxLen === 0) return 1.0;

    const distance = levenshteinDistance(normalizedStr1, normalizedStr2);
    const similarity = 1 - (distance / maxLen);

    return Math.max(0, similarity);
};

export class Logger {

    enabled: boolean;
  constructor({enabled = true}: {enabled?: boolean} = {}) {
    this.enabled = enabled; 
  }

  log(message: string, ...args: any[]) {
    if (this.enabled) {
      console.log(message, ...args);
    }
  }
}