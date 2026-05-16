export const parseLabels = (labels) => {
  if (!labels) return [];

  const parsedLabels = typeof labels === 'string' ? JSON.parse(labels) : labels;
  if (!Array.isArray(parsedLabels)) return [];

  return parsedLabels.filter((label) => label?.id != null);
};
