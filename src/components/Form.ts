import { i18n } from "../locales/i18n";
const { t } = i18n.global;

export const transformPatternList = [
  {
    label: t("transformPatternList.timestampToDate"),
    value: "timestampToDate",
  },
  {
    label: t("transformPatternList.dateToTimestamp"),
    value: "dateToTimestamp",
  },
];
export const unitList = [
  {
    label: t("unitList.millis"),
    value: "millis",
  },
  {
    label: t("unitList.seconds"),
    value: "seconds",
  },
];