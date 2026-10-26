import React, { useState, useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import clsx from "clsx";
import { styled } from "@mui/material/styles";
import {
  combine,
  withHistory,
  withModulesManager,
  historyPush,
  ProgressOrError,
  useParams,
  useLocation,
  ErrorBoundary,
  useTranslations,
} from "@openimis/fe-core";
import PricelistForm from "../components/PricelistForm";
import {
  createItemsPricelist,
  updateItemsPricelist,
  fetchItemsPricelistByUuid,
  fetchItemsPricelistDetails,
  medicalItemsSetValid,
} from "../actions";
import { RIGHT_ITEMS_PRICELISTS_EDIT, ITEMS_PRICELIST_TYPE } from "../constants";
import { getInitialOriginalName } from "../helpers/pricelist";
import { getPricelistUuid } from "../helpers/routing";

const StyledItemsPriceListDetailsPage = styled("div")(({ theme }) => ({
  ...theme.page ?? {},
  "&.locked": theme.page?.locked ?? {},
}));

const ItemsPriceListDetailsPage = (props) => {
  const { history, modulesManager } = props;
  const params = useParams();
  const location = useLocation();
  const dispatch = useDispatch();
  const pricelistUuid = getPricelistUuid(params, location.pathname);
  const { formatMessageWithValues } = useTranslations("medical_pricelist", modulesManager);
  const rights = useSelector((state) => state.core?.user?.i_user?.rights ?? []);
  const pricelistState = useSelector((state) => state.medical_pricelist.pricelists.items);
  const details = useSelector((state) => state.medical_pricelist.items);
  const storedPricelist = useMemo(() => {
    if (!pricelistUuid) {
      return null;
    }
    if (pricelistState.item?.uuid === pricelistUuid) {
      return pricelistState.item;
    }
    return pricelistState.items[pricelistUuid] ?? null;
  }, [pricelistUuid, pricelistState.item, pricelistState.items]);
  const [isLocked, setLocked] = useState(false);
  const [resetKey, setResetKey] = useState(null);
  const [originalName, setOriginalName] = useState(() =>
    getInitialOriginalName(pricelistUuid, location.state, null)
  );
  const [pricelist, setPricelist] = useState(() =>
    location.state?.pricelist?.uuid === pricelistUuid ? location.state.pricelist : {}
  );

  useEffect(() => {
    if (!pricelistUuid) {
      setPricelist({});
      return;
    }
    dispatch(fetchItemsPricelistByUuid(modulesManager, pricelistUuid));
  }, [dispatch, modulesManager, pricelistUuid, resetKey]);

  // The form renders at once from the list row, then the fetch by uuid returns:
  // once the user has edited, a late response must not overwrite their changes.
  const editedFor = useRef(null);
  const editKey = `${pricelistUuid}-${resetKey}`;

  useEffect(() => {
    if (!pricelistUuid) {
      setPricelist({});
      return;
    }
    if (editedFor.current === editKey) {
      return;
    }
    if (storedPricelist?.uuid === pricelistUuid) {
      setPricelist(storedPricelist);
    } else if (location.state?.pricelist?.uuid === pricelistUuid) {
      setPricelist(location.state.pricelist);
    }
  }, [pricelistUuid, editKey, location.state, storedPricelist]);

  const onChange = (edited) => {
    editedFor.current = editKey;
    setPricelist(edited);
  };

  useEffect(() => {
    if (originalName) {
      return;
    }
    const resolvedOriginalName = getInitialOriginalName(pricelistUuid, location.state, storedPricelist);
    if (resolvedOriginalName) {
      setOriginalName(resolvedOriginalName);
    }
  }, [originalName, pricelistUuid, location.state, storedPricelist]);

  useEffect(() => {
    if (originalName && pricelist?.uuid) {
      dispatch(medicalItemsSetValid());
    }
  }, [originalName, pricelist?.uuid, dispatch]);

  const onSave = (pricelist) => {
    setLocked(true);
    if (pricelist.uuid) {
      dispatch(
        updateItemsPricelist(
          modulesManager,
          pricelist,
          formatMessageWithValues("updatePricelist.mutationLabel", { name: pricelist.name })
        )
      );
    } else {
      dispatch(
        createItemsPricelist(
          modulesManager,
          pricelist,
          formatMessageWithValues("createPricelist.mutationLabel", { name: pricelist.name })
        )
      );
    }
  };

  const onReset = () => {
    setLocked(false);
    setResetKey(Date.now());
  };

  const fetchDetails = (filters) => {
    dispatch(fetchItemsPricelistDetails(modulesManager, filters, pricelist?.id));
  };

  const isNew = !pricelistUuid;
  const isReady = isNew || pricelist?.uuid === pricelistUuid;

  return (
    <StyledItemsPriceListDetailsPage className={clsx(pricelist.validityTo && "locked")}>
      <ErrorBoundary>
        <ProgressOrError progress={pricelistState.isFetching && !isReady} error={pricelistState.error} />
        {isReady && (
          <PricelistForm
            key={`${resetKey ?? "new"}-${pricelistUuid ?? "pending"}`}
            readOnly={!rights.includes(RIGHT_ITEMS_PRICELISTS_EDIT) || isLocked}
            pricelist={pricelist}
            pricelistType={ITEMS_PRICELIST_TYPE}
            originalName={originalName}
            onChange={onChange}
            onBack={() => historyPush(modulesManager, history, "medical_pricelist.itemsPricelists")}
            onSave={rights.includes(RIGHT_ITEMS_PRICELISTS_EDIT) ? onSave : undefined}
            onReset={onReset}
            details={details}
            fetchDetails={fetchDetails}
          />
        )}
      </ErrorBoundary>
    </StyledItemsPriceListDetailsPage>
  );
};

const enhance = combine(withHistory, withModulesManager);

export { StyledItemsPriceListDetailsPage };
export default enhance(ItemsPriceListDetailsPage);