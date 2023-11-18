<script setup lang="ts">
import type { ITable, IView, IGridView } from "@lark-base-open/js-sdk";
import { bitable } from "@lark-base-open/js-sdk";
import { BaseClient } from "@base-open/node-sdk";
import { ref, onMounted, shallowRef } from "vue";
import { ArrowRightBold } from "@element-plus/icons-vue";

import LogicBlock from "./LogicBlock.vue";
const base = bitable.base;
const tableNameList = ref<any[]>([]);
const tableList = ref([]);
const activeTableName = ref("");
const activeFiledList = ref<any>([]);
const activeFiledName = ref("");
const activeView = shallowRef<IView>();

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
  activeFiledName.value = fieldList[0].name;
  return fieldList;
};

const handleTableSelect = async () => {
  const table = await base.getTableByName(activeTableName.value);
  const fieldList = await getFieldList(table);
  console.log(fieldList);
  activeFiledList.value = fieldList;
};

const handleConfirm = async () => {
  // 新建 BaseClient，贴上需要操作的 appToken 和 personalBaseToken
  const client = new BaseClient({
    appToken: "IIHabdeTea4fLVsYklHcDjsSnHc",
    personalBaseToken: "pt-0Uudue96o2tGnQqEmH4uKgj1btRf7ulwXigMVmWLAQAAAUBAMwQAQ0F95ZDY",
  });
  client.base.appTableView.patch({
    path: {
      table_id: "tblJzaa0Qbg6YDyM",
      view_id: "vewNNJTfJp"
    },
    data: {
      property: {
        hidden_fields: ["fldWK6QuK4"]
      }
    }
  })
};

onMounted(async () => {
  const selection = await bitable.base.getSelection();
  console.log("selection: ", selection);
  const activeTable = await getActiveTable();
  activeView.value = await activeTable.getActiveView();
  const fieldLL = await activeView.value.getFieldMetaList();
  console.log("activeView: ", fieldLL);
  activeTableName.value = await getTableName(activeTable);
  const tableList = await getTableList();
  const tempNameList: any[] = [];
  for (let i = 0; i < tableList.length; i++) {
    tempNameList.push(await getTableName(tableList[i]));
  }
  tableNameList.value = tempNameList;
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
          style="width: 100%; border-radius: 10px"
        >
          <el-option
            v-for="item in tableNameList"
            :key="item"
            :label="item"
            :value="item"
          />
        </el-select>
      </el-form-item>
    </el-form>
    <el-col :span="24">
      <LogicBlock :activeFiledList="activeFiledList"></LogicBlock>
    </el-col>
    <div>
      <el-button type="primary" @click="handleConfirm"> 确定 </el-button>
      <el-button> 重置 </el-button>
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
