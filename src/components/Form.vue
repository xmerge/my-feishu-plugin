<script setup lang="ts">
import {
  ITable,
  IView,
  IField,
  IFieldMeta,
  ITableMeta,
  INumberField,
  IDateTimeField,
  IViewMeta,
  IOpenSegment,
  FieldType,

  ITextField,
} from "@lark-base-open/js-sdk";
import { bitable } from "@lark-base-open/js-sdk";
import { BaseClient } from "@base-open/node-sdk";
import { ref, onMounted, shallowRef } from "vue";
import dayjs from "dayjs";
import { ArrowRightBold } from "@element-plus/icons-vue";

import LogicBlock from "./LogicBlock.vue";

const isTransforming = ref(false);
const sucessCounter = ref(0);
const failureCounter = ref(0);
const stopFlag = ref(false);
const finishFlag = ref(false);
const recordCount = ref(0);

const base = bitable.base;
const tableList = shallowRef<ITableMeta[]>([]);
const activeTable = shallowRef<ITable>();
const fieldList = shallowRef<IFieldMeta[]>([]);
const activeTableName = ref("");
const originField = shallowRef<IFieldMeta>();
const targetField = shallowRef<IFieldMeta>();
const activeUnit = ref({
  label: "毫秒时间戳",
  value: "millis",
});
const activeTransformPattern = ref({
  label: "时间戳转日期",
  value: "timestampToDate",
});
const transformPatternList = [
  {
    label: "时间戳转日期",
    value: "timestampToDate",
  },
  {
    label: "日期转时间戳",
    value: "dateToTimestamp",
  },
];
const unitList = [
  {
    label: "毫秒时间戳",
    value: "millis",
  },
  {
    label: "秒时间戳",
    value: "seconds",
  },
];

function formatUnixTimestamp(unixTimestamp: number): string {
  const date = dayjs.unix(unixTimestamp);
  return date.format("YYYY-MM-DD HH:mm");
}

const getActiveTable = async () => {
  const table = await base.getActiveTable();
  return table;
};

const getTableList = async () => {
  const tableList = await base.getTableList();
  console.log(tableList);
  return tableList;
};

const getTableName = async (table) => {
  const tableName = await table.getName();
  return tableName;
};

const getFieldList = async (table) => {
  const fieldList = await table.getFieldMetaList();
  // activeFiledName.value = fieldList[0].name;
  return fieldList;
};

const handleTableSelect = (): void => {
  originField.value = undefined;
  targetField.value = undefined;
  // 增加
};

const handleReset = (): void => {
  isTransforming.value = true;
  stopFlag.value = false;
  finishFlag.value = false;
  sucessCounter.value = 0;
  recordCount.value = 0;
  failureCounter.value = 0;
};

const extractValueByRecordId = async (
  singleSelectField: ITextField | IDateTimeField | INumberField,
  recordId: string
): Promise<number | null > => {
  const originFieldVar = await singleSelectField.getValue(recordId);
  if (originFieldVar === null) {
    return null;
  }
  let text0IsNumber = true;
  let res: number;
  // 本身是 IDateTimeField || INumberField 类型
  res = originFieldVar as number;
  // 本身是 ITextField 类型
  if (Array.isArray(originFieldVar) && originFieldVar[0].type == "text") {
    res = Number(originFieldVar[0].text);
    if (Number.isNaN(res)) {
      failureCounter.value++;
    }
  }
  return res;
};

const setValueByRecordId = async (
  targetSelectField: ITextField | IDateTimeField | INumberField,
  recordId: string,
  targetVal: number
): Promise<void> => {
  let res: Promise<void>;
  const field = targetSelectField as IDateTimeField | INumberField;
  if (targetSelectField["IOpenSegment[]"]) {
    console.log("文本");
  } else {
    console.log("非文本");
  }
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

const handleConfirm = async () => {
  if (!(originField.value && targetField.value)) {
    return;
  }
  handleReset();
  if (activeTable.value) {
    console.log("开始1");
    const recordIdList = await activeTable.value.getRecordIdList();
    console.log("开始2");
    const originSelectField = await activeTable.value.getField<
      IDateTimeField | ITextField | INumberField
    >(originField.value.id);
    console.log("开始3");
    const targetSelectField = await activeTable.value.getField<
      IDateTimeField | ITextField
    >(targetField.value.id);
    try {
      const promises: Promise<void>[] = [];
      for (const recordId of recordIdList) {
        const val = await extractValueByRecordId(originSelectField, recordId);
        if (!val) {
          continue;
        }
        console.log(val);
        recordCount.value++;
        if (!stopFlag.value) {
          let targetVal: number;
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
      if (!stopFlag.value && recordCount.value === sucessCounter.value) {
        finishFlag.value = true;
        console.log("all done");
      }
    }
  }
};

const handleStop = () => {
  if (finishFlag.value) {
    return;
  }
  stopFlag.value = true;
};

const getCurrentSelection = async () => {
  const selection = await bitable.base.getSelection();
  if (selection.tableId && selection.viewId) {
    activeTable.value = await bitable.base.getTableById(selection.tableId);
    const view = await activeTable.value.getViewById(selection.viewId);
    fieldList.value = await view.getFieldMetaList();
  }
};

const handleFieldChange = () => {
  console.log("handleFieldChange");
  getCurrentSelection();
  originField.value = undefined;
  targetField.value = undefined;
}

onMounted(async () => {
  await getCurrentSelection();
  // const off = bitable.base.onSelectionChange(handleSelectionChange);
  const offFieldModify = activeTable.value?.onFieldModify(handleFieldChange);
  const offFieldAdd = activeTable.value?.onFieldAdd(handleFieldChange);
  const offFieldDelete= activeTable.value?.onFieldDelete(handleFieldChange);
});
</script>

<template>
  <div style="padding-bottom: 10px">
    <el-form label-position="top">
      <el-form-item label="选择数据表">
        <el-select
          v-model="activeTableName"
          class="m-2"
          placeholder="请选择数据表"
          :change="handleTableSelect()"
          style="width: 90%"
        >
          <el-option
            v-for="item in tableList"
            :key="item.id"
            :label="item.name"
            :value="item.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="选择转换模式">
        <el-select
          v-model="activeTransformPattern"
          value-key="value"
          class="m-2"
          placeholder="请选转换模式"
          :change="handleTableSelect()"
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
        <el-form-item label="选择源字段（时间戳字段）">
          <el-row
            style="width: 90%; display: flex; justify-content: space-between"
          >
            <el-select
              v-model="originField"
              value-key="id"
              class="m-2"
              placeholder="选择时间戳字段"
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
              placeholder="单位"
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
        <el-form-item label="选择生成目标字段（日期字段）">
          <el-select
            v-model="targetField"
            value-key="id"
            class="m-2"
            placeholder="选择目标字段"
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
        <el-form-item label="选择源字段（日期字段）">
          <el-select
            v-model="originField"
            value-key="id"
            class="m-2"
            placeholder="选择目标字段"
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
        <el-form-item label="选择目标字段（时间戳字段）">
          <el-row
            style="width: 90%; display: flex; justify-content: space-between"
          >
            <el-select
              v-model="targetField"
              value-key="id"
              class="m-2"
              placeholder="选择时间戳字段"
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
              placeholder="单位"
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
    <el-col :span="24">
      <!-- <LogicBlock :activeFiledList="activeFiledList"></LogicBlock> -->
    </el-col>
    <div>
      <el-button type="primary" @click="handleConfirm"> 开始转换 </el-button>
      <el-button @click="handleStop"> 停止 </el-button>
    </div>
    <div v-if="isTransforming" style="padding-top: 20px; font-size: medium">
      <div style="padding-bottom: 10px">
        <div style="padding-bottom: 10px">转换成功： {{ sucessCounter }}</div>
        <div style="padding-bottom: 10px">转换失败： {{ failureCounter }}</div>
        <div v-if="finishFlag" style="padding-bottom: 10px">
          <el-tag v-if="!stopFlag" type="success" size="large">
            转换完成
          </el-tag>
        </div>
        <div v-if="stopFlag" style="padding-bottom: 10px">
          <el-tag type="info" size="large"> 转换停止 </el-tag>
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
