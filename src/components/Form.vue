<script setup lang="ts">
import type {
  ITable,
  IView,
  IField,
  IFieldMeta,
  ITableMeta,
  ISingleSelectField,
  IDateTimeField,
  IViewMeta,
} from "@lark-base-open/js-sdk";
import { bitable } from "@lark-base-open/js-sdk";
import { BaseClient } from "@base-open/node-sdk";
import { ref, onMounted, shallowRef } from "vue";
import dayjs from "dayjs";
import { ArrowRightBold } from "@element-plus/icons-vue";

import LogicBlock from "./LogicBlock.vue";

const isTransforming = ref(false);
const sucessCounter = ref(0);
const stopFlag = ref(false);
const finishFlag = ref(false);
const recordCount = ref(0);

const base = bitable.base;
const tableNameList = ref<any[]>([]);
const tableList = shallowRef<ITableMeta[]>([]);
const activeTable = shallowRef<ITable>();
const activeFiledList = ref<any>([]);
const fieldList = shallowRef<IFieldMeta[]>([]);
const activeTableName = ref("");
const originField = ref();
const targetFiled = ref();
const activeView = shallowRef<IView | IViewMeta>();
const activeUnit = ref({
  label: "毫秒时间戳",
  value: "millis",
});
const activeTransformPattern = ref({
  label: "时间戳转日期",
  value: "timestampToDate",
});
const transformPatterList = [
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

const handleTableSelect = async () => {
  // const table = await base.getTableByName(activeTableName.value);
  // const fieldList = await getFieldList(table);
  // console.log(fieldList);
  // activeFiledList.value = fieldList;
};

const handleConfirm = async () => {
  isTransforming.value = true;
  stopFlag.value = false;
  sucessCounter.value = 0;
  finishFlag.value = false;
  recordCount.value = 0;
  sucessCounter.value = 0;
  console.log("originField: ", originField.value);
  if (activeTable.value) {
    const recordIdList = await activeTable.value.getRecordIdList();
    const singleSelectField =
      await activeTable.value.getField<ISingleSelectField>(originField.value);
    const targetSelectField = await activeTable.value.getField<IDateTimeField>(
      targetFiled.value
    );
    try {
      const promises: Promise<void>[] = [];
      for (const recordId of recordIdList) {
        let val = await singleSelectField.getValue(recordId);
        recordCount.value++;
        if (val && !stopFlag.value) {
          let targetVal = val[0].text;
          const promise = targetSelectField
            .setValue(recordId, Number(targetVal))
            .then(() => {
              sucessCounter.value++;
            });
          promises.push(promise);
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

onMounted(async () => {
  const selection = await bitable.base.getSelection();
  tableList.value = await bitable.base.getTableMetaList();
  console.log("selection: ", selection);
  if (selection.tableId && selection.viewId) {
    activeTable.value = await bitable.base.getTableById(selection.tableId);
    console.log("activeTable: ", activeTable);
    const view = await activeTable.value.getViewById(selection.viewId);
    console.log("view: ", view);
    fieldList.value = await view.getFieldMetaList();
    console.log("fieldList: ", fieldList.value);
  }

  // activeView.value = await activeTable.getActiveView();
  const fieldLL = await activeView.value.getFieldMetaList();
  console.log("activeView: ", fieldLL);
  // activeTableName.value = await getTableName(activeTable);
  // const tableList = await getTableList();
  // const tempNameList: any[] = [];
  // for (let i = 0; i < tableList.length; i++) {
  //   tempNameList.push(await getTableName(tableList[i]));
  // }
  // tableNameList.value = tempNameList;
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
          class="m-2"
          placeholder="请选择数据表"
          :change="handleTableSelect()"
          style="width: 90%"
        >
          <el-option
            v-for="item in transformPatterList"
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
                :value="item.id"
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
            v-model="targetFiled"
            class="m-2"
            placeholder="选择目标字段"
            style="width: 90%"
          >
            <el-option
              v-for="item in fieldList.filter((item) => item.type === 5)"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
      </div>
      <div v-else-if="activeTransformPattern.value == `dateToTimestamp`">
        <el-form-item label="选择源字段（日期字段）">
          <el-select
            v-model="targetFiled"
            class="m-2"
            placeholder="选择目标字段"
            style="width: 90%"
          >
            <el-option
              v-for="item in fieldList.filter((item) => item.type === 5)"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="选择目标字段（时间戳字段）">
          <el-row
            style="width: 90%; display: flex; justify-content: space-between"
          >
            <el-select
              v-model="originField"
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
                :value="item.id"
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
    <div
      v-if="isTransforming"
      style="padding-top: 20px; font-size: large; font-weight: medium"
    >
      <el-row style="display: flex; align-items: center; padding-inline;: 10px">
        <span> 已转换： {{ sucessCounter }} </span>
        <span v-if="finishFlag">
          <el-tag v-if="!stopFlag" type="success" size="big"> 转换完成 </el-tag>
        </span>
        <span v-if="stopFlag">
          <el-tag type="info" size="big"> 转换停止 </el-tag>
        </span>
      </el-row>
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
