<script setup lang="ts">
import {
  ITable,
  IFieldMeta,
  INumberField,
  IDateTimeField,
  FieldType,
  ITextField,
  IEventCbCtx,
  Selection,
} from "@lark-base-open/js-sdk";
import { bitable } from "@lark-base-open/js-sdk";
import { ref, onMounted, shallowRef, computed } from "vue";
import { i18n } from "../locales/i18n";

const { t } = i18n.global;

/** 页面加载数据 */
const isTransformed = ref(false);
const sucessCounter = ref(0);
const failureCounter = ref(0);
const stopFlag = ref(false);
const finishFlag = ref(false);
const recordCount = ref(0);
const isLoading = ref(false);

/** 页面数据 */
const activeTable = shallowRef<ITable>();
const fieldList = shallowRef<IFieldMeta[]>([]);
const activeTableName = ref("");
const activeTableId = ref("");
const originField = shallowRef<IFieldMeta>();
const targetField = shallowRef<IFieldMeta>();
const activeTransformPattern = ref({
  label: "",
  value: ""
});
const activeUnit = ref({
  label: "",
  value: ""
});
const transformPatternList = computed(() => {
  return [
    {
      label: t("transformPatternList.timestampToDate"),
      value: "timestampToDate",
    },
    {
      label: t("transformPatternList.dateToTimestamp"),
      value: "dateToTimestamp",
    },
  ];
});
const unitList = computed(() => {
  return [
    {
      label: t("unitList.millis"),
      value: "millis",
    },
    {
      label: t("unitList.seconds"),
      value: "seconds",
    },
  ];
});

/**
 * 处理单位变化的函数
 */
const handleUnitChange = (): void => {
  originField.value = undefined; // 重置原字段的值为undefined
  targetField.value = undefined; // 重置目标字段的值为undefined
};

/**
 * 重置页面信息
 */
const handleReset = (): void => {
  isTransformed.value = true;
  isLoading.value = true;
  stopFlag.value = false;
  finishFlag.value = false;
  sucessCounter.value = 0;
  recordCount.value = 0;
  failureCounter.value = 0;
};

/**
 * 提取字段值
 * @param selectedField 源字段
 * @param recordId 记录Id
 */
const extractValueByRecordId = async (
  selectedField: SupportField,
  recordId: string
): Promise<number | null> => {
  const originFieldVar = await selectedField.getValue(recordId);
  if (originFieldVar === null) {
    return null;
  }
  let res: number | null = null;
  // 本身是 IDateTimeField || INumberField 类型
  if (
    originField.value?.type === FieldType.Number ||
    originField.value?.type === FieldType.DateTime
  ) {
    res = originFieldVar as number;
  } else if (originField.value?.type === FieldType.Text) {
    // 本身是 ITextField 类型
    if (Array.isArray(originFieldVar) && originFieldVar[0].type == "text") {
      res = Number(originFieldVar[0].text);
      if (Number.isNaN(res)) {
        failureCounter.value++;
      }
    }
  }
  return res;
};

/**
 * 设置字段值
 * @param targetSelectField 目标字段
 * @param recordId 记录Id
 * @param targetVal 目标值
 */
const setValueByRecordId = async (
  targetSelectField: SupportField,
  recordId: string,
  targetVal: number
): Promise<void> => {
  let res: Promise<void>;
  if (targetField.value?.type === FieldType.Text) {
    res = (targetSelectField as ITextField)
      .setValue(recordId, targetVal.toString())
      .then(() => {
        sucessCounter.value++;
      })
      .catch(() => {
        failureCounter.value++;
      });
  } else {
    res = (targetSelectField as IDateTimeField | INumberField)
      .setValue(recordId, targetVal)
      .then(() => {
        sucessCounter.value++;
      })
      .catch(() => {
        failureCounter.value++;
      });
  }

  return res;
};

/**
 * 提交转换
 */
const handleConfirm = async () => {
  if (!(originField.value && targetField.value)) {
    return;
  }
  if (!activeUnit.value.value) {
    activeUnit.value.value = "millis"
  }
  handleReset();
  if (activeTable.value) {
    const recordIdList = await activeTable.value.getRecordIdList();
    const originSelectField = await activeTable.value.getField<SupportField>(
      originField.value.id
    );
    const targetSelectField = await activeTable.value.getField<SupportField>(
      targetField.value.id
    );
    try {
      const promises: Promise<void>[] = [];
      for (const recordId of recordIdList) {
        const val = await extractValueByRecordId(originSelectField, recordId);
        if (!val) {
          continue;
        }
        recordCount.value++;
        if (!stopFlag.value) {
          let targetVal: number;
          // 单位转换
          if (activeTransformPattern.value.value == "timestampToDate") {
            targetVal = activeUnit.value.value == `millis` ? val : val * 1000;
          } else {
            targetVal = activeUnit.value.value == `millis` ? val : val / 1000;
          }
          const proimse = setValueByRecordId(
            targetSelectField,
            recordId,
            targetVal
          );
          promises.push(proimse);
        }
      }
      await Promise.all(promises);
    } finally {
      isLoading.value = false;
      if (!stopFlag.value && recordCount.value === sucessCounter.value) {
        finishFlag.value = true;
      }
    }
  }
};

/**
 * 停止转换
 */
const handleStop = () => {
  if (finishFlag.value) {
    return;
  }
  isLoading.value = false;
  stopFlag.value = true;
};

/**
 * 获取当前选中的表信息
 */
const getCurrentSelection = async () => {
  const selection = await bitable.base.getSelection();
  if (selection.tableId && selection.viewId) {
    activeTable.value = await bitable.base.getTableById(selection.tableId);
    activeTableId.value = activeTable.value.id;
    activeTableName.value = await activeTable.value.getName();
    const view = await activeTable.value.getViewById(selection.viewId);
    fieldList.value = await view.getFieldMetaList();
  }
};

/**
 * 字段变化时触发
 */
const handleFieldChange = () => {
  console.log("handleFieldChange");
  getCurrentSelection();
  originField.value = undefined;
  targetField.value = undefined;
};

/**
 * 选择变化时触发
 * 仅处理table变化时
 */
const handleSelectionChange = (e: IEventCbCtx<Selection>) => {
  if (e.data.tableId != activeTableId.value) {
    handleFieldChange();
  }
};

/**
 * 组件挂载时触发
 */
onMounted(async () => {
  await getCurrentSelection();
  // 注册选择变化监听器
  const off = bitable.base.onSelectionChange(handleSelectionChange);
  // 注册字段修改监听器
  const offFieldModify = activeTable.value?.onFieldModify(handleFieldChange);
  // 注册字段添加监听器
  const offFieldAdd = activeTable.value?.onFieldAdd(handleFieldChange);
  // 注册字段删除监听器
  const offFieldDelete = activeTable.value?.onFieldDelete(handleFieldChange);
});

type SupportField = ITextField | IDateTimeField | INumberField;
</script>

<template>
  <div style="padding-bottom: 10px">
    <el-form label-position="top">
      <el-row
        style="
          display: flex;
          align-items: center;
          padding-bottom: 15px;
          font-size: large;
        "
      >
        {{ t("form.currentTable") }}
        <el-tag type="success" size="medium" style="margin-left: 10px">
          {{ activeTableName }}
        </el-tag>
      </el-row>

      <el-form-item :label="t(`form.chooseSelectMode`)">
        <el-select
          v-model="activeTransformPattern"
          value-key="value"
          class="m-2"
          :placeholder="t(`form.chooseSelectMode`)"
          :change="handleUnitChange()"
          style="width: 90%"
        >
          <el-option
            v-for="item in transformPatternList"
            :key="item.value"
            :label="item.label"
            :value="item"
          />
        </el-select>
      </el-form-item>
      <div v-if="activeTransformPattern.value == `timestampToDate`">
        <el-form-item :label="t(`form.chooseOriginField.timestamp`)">
          <el-row
            style="width: 90%; display: flex; justify-content: space-between"
          >
            <el-select
              v-model="originField"
              value-key="id"
              class="m-2"
              :placeholder="t(`form.chooseTimeStampField`)"
              style="width: 60%; border-radius: 10px"
            >
              <el-option
                v-for="item in fieldList.filter(
                  (item) => item.type === 1 || item.type === 2
                )"
                :key="item.id"
                :label="item.name"
                :value="item"
              />
            </el-select>
            <el-select
              v-model="activeUnit"
              class="m-2"
              :placeholder="t(`form.unit`)"
              style="width: 35%"
            >
              <el-option
                v-for="item in unitList"
                :key="item.value"
                :label="item.label"
                :value="item"
              />
            </el-select>
          </el-row>
        </el-form-item>
        <el-form-item :label="t(`form.chooseTargetField.date`)">
          <el-select
            v-model="targetField"
            value-key="id"
            class="m-2"
            :placeholder="t(`form.chooseTargetField.plain`)"
            style="width: 90%"
          >
            <el-option
              v-for="item in fieldList.filter((item) => item.type === 5)"
              :key="item.id"
              :label="item.name"
              :value="item"
            />
          </el-select>
        </el-form-item>
      </div>
      <div v-else-if="activeTransformPattern.value == `dateToTimestamp`">
        <el-form-item :label="t(`form.chooseOriginField.date`)">
          <el-select
            v-model="originField"
            value-key="id"
            class="m-2"
            :placeholder="t(`form.chooseTargetField.plain`)"
            style="width: 90%"
          >
            <el-option
              v-for="item in fieldList.filter((item) => item.type === 5)"
              :key="item.id"
              :label="item.name"
              :value="item"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="t(`form.chooseTargetField.timestamp`)">
          <el-row
            style="width: 90%; display: flex; justify-content: space-between"
          >
            <el-select
              v-model="targetField"
              value-key="id"
              class="m-2"
              :placeholder="t(`form.chooseTimeStampField`)"
              style="width: 60%; border-radius: 10px"
            >
              <el-option
                v-for="item in fieldList.filter(
                  (item) => item.type === 1 || item.type === 2
                )"
                :key="item.id"
                :label="item.name"
                :value="item"
              />
            </el-select>
            <el-select
              v-model="activeUnit"
              class="m-2"
              :placeholder="t(`form.unit`)"
              style="width: 35%"
            >
              <el-option
                v-for="item in unitList"
                :key="item.value"
                :label="item.label"
                :value="item"
              />
            </el-select>
          </el-row>
        </el-form-item>
      </div>
    </el-form>
    <el-col :span="24"> </el-col>
    <div>
      <el-button type="primary" :disabled="isLoading" @click="handleConfirm">
        {{ isLoading ? t("status.transforming") : t("status.confirm") }}
      </el-button>
      <el-button @click="handleStop"> {{ t("status.stop") }} </el-button>
    </div>
    <div v-if="isTransformed" style="padding-top: 20px; font-size: medium">
      <div style="padding-bottom: 10px">
        <div style="padding-bottom: 10px">
          {{ t("status.succeeded") + sucessCounter }}
        </div>
        <div style="padding-bottom: 10px">
          {{ t("status.failed") + failureCounter }}
          <span v-if="failureCounter">
            {{ t("status.checkOriginField") }}
          </span>
        </div>
        <div v-if="finishFlag && !stopFlag" style="padding-bottom: 10px">
          <el-tag v-if="sucessCounter" type="primary" size="large">
            {{ t("status.completeTag") }}
          </el-tag>
          <el-tag v-else type="warning" size="large">
            {{ t("status.failTag") }}
          </el-tag>
        </div>
        <div v-if="stopFlag" style="padding-bottom: 10px">
          <el-tag type="info" size="large">
            {{ t("status.stopTag") }}
          </el-tag>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.form :deep(.el-form-item__label) {
  font-size: 16px;
  color: var(--el-text-color-primary);
  margin-bottom: 0;
}
.form :deep(.el-form-item__content) {
  font-size: 16px;
}
.modeSelect :deep(.el-input__inner) {
  font-weight: bold;
}
:deep(.el-form-item__label) {
  font-size: medium;
  font-weight: medium;
}
:deep(.el-card__body) {
  padding-left: 0px;
  padding-right: 0px;
  /* margin-top: 10px; */
}
.card-header {
  display: flex;
  margin-left: -10px;
  margin-right: -10px;
  justify-content: space-between;
  align-items: center;
}

.text {
  font-size: 14px;
}

.item {
  margin-bottom: 18px;
}
.expand-icon :hover {
  cursor: pointer;
}
</style>
