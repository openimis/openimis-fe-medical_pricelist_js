import React, { useState, useEffect, useMemo } from "react";
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
  createServicesPricelist,
  updateServicesPricelist,
  fetchServicesPricelistByUuid,
  fetchServicesPricelistDetails,
  medicalServicesSetValid,
} from "../actions";
import { RIGHT_SERVICES_PRICELISTS_EDIT, SERVICES_PRICELIST_TYPE } from "../constants";
import { getInitialOriginalName } from "../helpers/pricelist";
import { getPricelistUuid } from "../helpers/routing";

const StyledServicesPriceListDetailsPage = styled("div")(({ theme }) => ({
  ...theme.page ?? {},
  "&.locked": theme.page?.locked ?? {},
}));

const ServicesPriceListDetailsPage = (props) => {
  const { history, modulesManager } = props;
  const params = useParams();
  const location = useLocation();
  const dispatch = useDispatch();
  const pricelistUuid = getPricelistUuid(params, location.pathname);
  const { formatMessageWithValues } = useTranslations("medical_pricelist", modulesManager);
  const rights = useSelector((state) => state.core?.user?.i_user?.rights ?? []);
  const pricelistState = useSelector((state) => state.medical_pricelist.pricelists.services);
  const details = useSelector((state) => state.medical_pricelist.services);
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
    dispatch(fetchServicesPricelistByUuid(modulesManager, pricelistUuid));
  }, [dispatch, modulesManager, pricelistUuid, resetKey]);

  useEffect(() => {
    if (!pricelistUuid) {
      setPricelist({});
      return;
    }
    if (location.state?.pricelist?.uuid === pricelistUuid) {
      setPricelist(location.state.pricelist);
    }
    if (storedPricelist?.uuid === pricelistUuid) {
      setPricelist(storedPricelist);
    }
  }, [pricelistUuid, location.state, storedPricelist]);

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
      dispatch(medicalServicesSetValid());
    }
  }, [originalName, pricelist?.uuid, dispatch]);

  const onSave = (pricelist) => {
    setLocked(true);
    if (pricelist.uuid) {
      dispatch(
        updateServicesPricelist(
          modulesManager,
          pricelist,
          formatMessageWithValues("updatePricelist.mutationLabel", { name: pricelist.name })
        )
      );
    } else {
      dispatch(
        createServicesPricelist(
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
    dispatch(fetchServicesPricelistDetails(modulesManager, filters, pricelist?.id));
  };

  const isNew = !pricelistUuid;
  const isReady = isNew || pricelist?.uuid === pricelistUuid;

  return (
    <StyledServicesPriceListDetailsPage className={clsx(pricelist.validityTo && "locked")}>
      <ErrorBoundary>
        <ProgressOrError progress={pricelistState.isFetching && !isReady} error={pricelistState.error} />
        {isReady && (
          <PricelistForm
            key={`${resetKey ?? "new"}-${originalName ?? pricelistUuid ?? "pending"}`}
            readOnly={!rights.includes(RIGHT_SERVICES_PRICELISTS_EDIT) || isLocked}
            pricelist={pricelist}
            pricelistType={SERVICES_PRICELIST_TYPE}
            originalName={originalName}
            onChange={setPricelist}
            onBack={() => historyPush(modulesManager, history, "medical_pricelist.servicesPricelists")}
            onSave={rights.includes(RIGHT_SERVICES_PRICELISTS_EDIT) ? onSave : undefined}
            onReset={onReset}
            details={details}
            fetchDetails={fetchDetails}
          />
        )}
      </ErrorBoundary>
    </StyledServicesPriceListDetailsPage>
  );
};

const enhance = combine(withHistory, withModulesManager);

export { StyledServicesPriceListDetailsPage };
export default enhance(ServicesPriceListDetailsPage);