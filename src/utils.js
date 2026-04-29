export function generateTrigramQuery(query) {
  let ftsQuery = query;
  if (!query) return ftsQuery;

  // Manually extract trigrams and use an AND query for Detail='none' limits.
  if (query.length >= 3 && !query.includes(' AND ') && !query.includes(' OR ')) {
    const trigrams = [];
    const cleanQ = query.replace(/[^\w\u4e00-\u9fa5]/gi, ''); 
    const arr = Array.from(cleanQ);
    for (let i = 0; i < arr.length - 2; i++) {
        trigrams.push(arr[i] + arr[i+1] + arr[i+2]);
    }
    if (trigrams.length > 0) {
      ftsQuery = trigrams.join(' AND ');
    }
  }
  
  // Replace long words with ANDed trigrams.
  ftsQuery = ftsQuery.replace(/([a-zA-Z0-9\u4e00-\u9fa5]{4,})/g, (match) => {
    const parts = [];
    const arr = Array.from(match);
    for(let i=0; i < arr.length - 2; i++) {
       parts.push(arr[i] + arr[i+1] + arr[i+2]);
    }
    if (parts.length > 0) {
       return '(' + parts.join(' AND ') + ')';
    }
    return match;
  });

  return ftsQuery;
}

export function bm25RankToScore(rank) {
  // FTS5 bm25() returns negative values
  // convert to 0-1 score
  return 1 / (1 + Math.exp(rank));
}
