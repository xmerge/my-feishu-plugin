<script setup lang="ts">
import { bitable } from "@lark-base-open/js-sdk";
import { ref, onMounted } from "vue";
import {
  ArrowRightBold,
  ArrowDownBold,
  Close,
  MoreFilled,
  Plus
} from "@element-plus/icons-vue";

import LogicBlock from "./LogicBlock.vue";
const base = bitable.base;
const tableNameList = ref<any[]>([]);
const tableList = ref([]);
const activeTableName = ref("");
const activeFiledList = ref<any>([]);
const activeFiledName = ref("");
const operator = ref("等于");
const isExpand = ref(true);
const valueee = ref("所有");

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

onMounted(async () => {
  const activeTable = await getActiveTable();
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
