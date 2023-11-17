<script setup>
import { bitable } from "@lark-base-open/js-sdk";
import { ref, onMounted } from "vue";
import { ArrowRightBold, ArrowDownBold, Close, MoreFilled } from "@element-plus/icons-vue";
// import { ElButton, ElForm, ElFormItem, ElSelect, ElOption } from "element-plus";
const base = bitable.base;
const tableNameList = ref([]);
const tableList = ref([]);
const activeTableName = ref("");
const activeFiledList = ref([]);
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
  const tempNameList = [];
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
      <el-card
        class="box-card"
        shadow="never"
        style="
          width: 100%;
          border-radius: 10px;
          margin-bottom: 18px;

          border-width: 2px;
        "
      >
        <template #header>
          <div class="card-header">
            <span
              style="
                font-weight: medium;
                font-size: medium;
                display: flex;
                align-items: center;
                justify-content: center;
              "
            >
              <span
                class="expand-icon"
                @click="
                  () => {
                    isExpand = !isExpand;
                  }
                "
                style="color: #409EFF;"
              >
                <el-icon v-if="isExpand == true"><ArrowDownBold /></el-icon>
                <el-icon v-else><ArrowRightBold /></el-icon>
              </span>

              <span>
                符合以下
                <el-select
                  v-model="valueee"
                  class="m-2"
                  placeholder="Select"
                  size="medium"
                  style="width: 75px"
                >
                  <el-option
                    class="modeSelect"
                    v-for="item in ['所有', '任一']"
                    :key="item"
                    :label="item"
                    :value="item"
                  />
                </el-select>
                要求
              </span>
            </span>
            <span >
              <el-button class="button" size="small" text>添加块</el-button>
              <!-- <el-button class="button" size="small" text bg style="margin-left: 3px;">添加条件</el-button> -->
              <el-button type="danger" class="button" size="small" text :icon="Close" style="width: 20px; margin-left: 3px;"></el-button>
            </span>
          </div>
        </template>
        

        <div v-if="isExpand == true" v-for="o in 3" :key="o" class="text item">
          <el-form style="margin-left: 10px; margin-right: 10px">
            <el-form-item>
              <el-row style="display: flex;justify-content: space-between; width: 100%; align-items: center;">
                <el-select
                  v-model="activeFiledName"
                  class="m-2"
                  style="width: 30%"
                >
                  <el-option
                    v-for="item in activeFiledList"
                    :key="item.name"
                    :label="item.name"
                    :value="item.name"
                  />
                </el-select>

                <span style="width: 60%; display: flex; padding-left: 10px; justify-content: space-between">
                  <el-select v-model="operator" class="m-2" style="width: 30%">
                    <el-option
                      v-for="item in [
                        '等于',
                        '不等于',
                        '大于',
                        '小于',
                        '大于等于',
                        '小于等于',
                      ]"
                      :key="item"
                      :label="item"
                      :value="item"
                    />
                  </el-select>
                  <el-input style="width: 65%"></el-input>
                  <!-- <el-button class="button" text size="small">x</el-button> -->
                </span>
                <el-button :icon="Close" size="small" text style="width: 15px; color: #409EFF ;"/>
              </el-row>
            </el-form-item>
          </el-form>
        </div>
        <div v-else>
          <span style="margin-left: 20px; color: #409EFF ;"> 
            <el-icon><MoreFilled /></el-icon>
          </span>
        </div>
      </el-card>
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

.box-card {
  width: 480px;
}
.expand-icon :hover {
  cursor: pointer;
}
</style>
