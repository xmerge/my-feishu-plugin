<script setup lang="ts">
import { ref, onMounted } from "vue";
import {
  ArrowRightBold,
  ArrowDownBold,
  Close,
  MoreFilled,
  Plus,
} from "@element-plus/icons-vue";

const props = defineProps<{
  activeFiledList: any[];
}>();
// 当前逻辑块是否展开
const isExpand = ref(true);
const operationMode = ref({
  label: "所有",
  value: "AND",
});
const judgeMode = ref("");

const operationModeList = [
  {
    label: "所有",
    value: "AND",
  },
  {
    label: "任一",
    value: "OR",
  },
];
const judgeList = ref<Judge[]>([]);

type Judge = {
  fieldName: String;
  judgeType: String;
  value: String;
};

const handleAddJudge = () => {
  judgeList.value.push({
    fieldName: props.activeFiledList[0].fieldName,
    judgeType: "",
    value: "",
  });
};
</script>

<template>
  <el-card class="box-card" shadow="never">
    <template #header>
      <div class="card-header">
        <span class="header-text">
          <span
            class="expand-icon"
            @click="
              () => {
                isExpand = !isExpand;
              }
            "
          >
            <el-icon v-if="isExpand == true"><ArrowDownBold /></el-icon>
            <el-icon v-else><ArrowRightBold /></el-icon>
          </span>

          <span>
            符合以下
            <el-select
              v-model="operationMode"
              class="m-2 mode-select"
              placeholder="操作"
              size="medium"
            >
              <el-option
                v-for="item in operationModeList"
                :label="item.label"
                :value="item.value"
                :key="item"
              />
            </el-select>
            要求
          </span>
        </span>
        <span>
          <el-button class="button" size="small" text>添加块</el-button>
          <el-button
            type="danger"
            class="button header-button"
            size="small"
            text
            :icon="Close"
          ></el-button>
        </span>
      </div>
    </template>

    <div v-if="isExpand == true" style="margin-left: 10px; margin-right: 10px">
      <div v-for="(i, _) in judgeList" :key="_" class="text item">
        <el-form>
          <el-form-item>
            <el-row
              style="
                display: flex;
                justify-content: space-between;
                width: 100%;
                align-items: center;
              "
            >
              <el-select
                v-model="i.fieldName"
                class="m-2"
                style="width: 30%"
                placeholder="字段"
              >
                <el-option
                  v-for="item in props.activeFiledList"
                  :key="item.name"
                  :label="item.name"
                  :value="item.name"
                />
              </el-select>

              <span
                style="
                  width: 60%;
                  display: flex;
                  padding-left: 10px;
                  justify-content: space-between;
                "
              >
                <el-select v-model="i.judgeType" class="m-2" style="width: 30%">
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
              </span>
              <el-button
                :icon="Close"
                size="small"
                text
                style="width: 15px; color: #409eff"
              />
            </el-row>
          </el-form-item>
        </el-form>
      </div>
      <span style="color: #409eff">
        <el-button
          class="button"
          size="small"
          :icon="Plus"
          @click="handleAddJudge"
          text
          bg
          style="color: #409eff"
          >
          添加筛选条件
          </el-button
        >
      </span>
    </div>

    <div v-else>
      <span style="margin-left: 20px; color: #409eff">
        <el-icon><MoreFilled /></el-icon>
      </span>
    </div>
  </el-card>
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
.card-header .mode-select {
  width: 75px;
}
.card-header .header-text {
  font-weight: medium;
  font-size: medium;
  display: flex;
  align-items: center;
  justify-content: center;
}
.header-button {
  width: 20px;
  margin-left: 3px;
}

.text {
  font-size: 14px;
}

.item {
  margin-bottom: 18px;
}

.box-card {
  width: 100%;
  border-radius: 10px;
  margin-bottom: 18px;
  border-width: 2px;
}
.expand-icon {
  color: #409eff;
}
.expand-icon :hover {
  cursor: pointer;
  color: #409eff;
}
</style>
