export const isItemActive = (edited, item) => {
  return edited.addedDetails?.includes(item.uuid) || (item.isActive && !edited.removedDetails?.includes(item.uuid));
};
