export const getLabelToneClass = (labelName = '') => {
  const normalized = labelName.trim().toLowerCase();

  if (['study', 'hoc tap', 'học tập', 'learning', 'school'].includes(normalized)) {
    return 'label-tone-study';
  }

  if (['work', 'cong viec', 'công việc', 'job'].includes(normalized)) {
    return 'label-tone-work';
  }

  if (['personal', 'ca nhan', 'cá nhân', 'private'].includes(normalized)) {
    return 'label-tone-personal';
  }

  if (['important', 'quan trong', 'quan trọng', 'urgent', 'priority'].includes(normalized)) {
    return 'label-tone-important';
  }

  return 'label-tone-custom';
};
