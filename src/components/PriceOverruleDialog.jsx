import React, { useEffect, useState } from "react";
import { styled } from "@mui/material/styles";
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";
import { combine, FormattedMessage, AmountInput } from "@openimis/fe-core";

const parsePriceValue = (price) => {
  if (price == null || price === "") return null;
  const num = Number(price);
  return Number.isNaN(num) ? null : num;
};

const StyledPriceOverruleDialog = styled("div")(({ theme }) => ({
  "& .primaryButton": theme.dialog?.primaryButton ?? {},
  "& .secondaryButton": theme.dialog?.secondaryButton ?? {},
}));

const PriceOverruleDialog = (props) => {
  const { open, onCancel, defaultPrice, onConfirm } = props;
  const [value, setValue] = useState(() => parsePriceValue(defaultPrice));

  useEffect(() => {
    setValue(parsePriceValue(defaultPrice));
  }, [defaultPrice]);

  return (
    <StyledPriceOverruleDialog>
      <Dialog open={open} onClose={onCancel}>
        <DialogTitle>
          <FormattedMessage module="medical_pricelist" id="priceOverruleDialog.title" />
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            <FormattedMessage module="medical_pricelist" id="priceOverruleDialog.message" />
          </DialogContentText>
          <AmountInput
            autoFocus
            margin="dense"
            id="price"
            module="medical_pricelist"
            label="medical_pricelist.priceOverruleDialog.input"
            min={0}
            value={value}
            onChange={setValue}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={(e) => onConfirm(value)} className="primaryButton" autoFocus>
            <FormattedMessage module="medical_pricelist" id="priceOverruleDialog.yes.button" />
          </Button>
          <Button onClick={(e) => onConfirm(null)} className="secondaryButton">
            <FormattedMessage module="medical_pricelist" id="priceOverruleDialog.clear.button" />
          </Button>
          <Button onClick={onCancel} className="secondaryButton">
            <FormattedMessage module="core" id="cancel" />
          </Button>
        </DialogActions>
      </Dialog>
    </StyledPriceOverruleDialog>
  );
};

const enhance = combine();

export default enhance(PriceOverruleDialog);
