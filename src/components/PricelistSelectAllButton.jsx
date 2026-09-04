import React from "react";
import { useTranslations } from "@openimis/fe-core";
import { Button } from "@mui/material";
import { isItemActive } from "../helpers/selection";

const PricelistSelectAllButton = ({ details, readOnly, edited, onEditedChanged, modulesManager }) => {
  const { formatMessage } = useTranslations("medical_pricelist", modulesManager);

  const pageItems = details?.items ?? [];
  const pageUuids = pageItems.map((item) => item.uuid);

  const allSelected = pageItems.length > 0 && pageItems.every((item) => isItemActive(edited, item));

  const handleTogglePage = () => {
    const added = edited?.addedDetails ?? [];
    const removed = edited?.removedDetails ?? [];

    if (allSelected) {
      // Unselect all items on this page
      const newAdded = added.filter((uuid) => !pageUuids.includes(uuid));
      const toRemove = pageItems.filter((item) => item.isActive).map((item) => item.uuid);
      const newRemoved = [...new Set([...removed, ...toRemove])];

      onEditedChanged({
        ...edited,
        addedDetails: newAdded,
        removedDetails: newRemoved,
      });
    } else {
      // Select all items on this page
      const toAdd = pageItems.filter((item) => !item.isActive).map((item) => item.uuid);
      const newAdded = [...new Set([...added, ...toAdd])];
      const newRemoved = removed.filter((uuid) => !pageUuids.includes(uuid));

      onEditedChanged({
        ...edited,
        addedDetails: newAdded,
        removedDetails: newRemoved,
      });
    }
  };

  return (
    <Button
      onClick={handleTogglePage}
      color="primary"
      disabled={readOnly || pageItems.length === 0}
      size="small"
      className="selectAllBtn"
    >
      {allSelected
        ? formatMessage("medical_pricelist.table.unselectAll")
        : formatMessage("medical_pricelist.table.selectAll")}
    </Button>
  );
};

export default PricelistSelectAllButton;
