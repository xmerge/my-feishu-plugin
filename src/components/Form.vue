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
import { ref, onMounted, shallowRef, computed, reactive } from "vue";
import { i18n } from "../locales/i18n";
import { ElMessage  } from 'element-plus'
import { WarningFilled } from "@element-plus/icons-vue";
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
const regexText = ref("");
const activeTable = shallowRef<ITable>();
const fieldList = shallowRef<IFieldMeta[]>([]);
const activeTableName = ref("");
const activeTableId = ref("");
const originField = shallowRef<IFieldMeta>();
const targetField = shallowRef<IFieldMeta>();
const errorMsg = ref("");
const activeTransformPattern = ref({
  label: "",
  value: "",
});
const activeUnit = ref({
  label: "",
  value: "",
});
const transformPatternList = computed(() => {
  return [
    {
      label: t("mode.test"),
      value: "test",
    },
    {
      label: t("mode.match"),
      value: "match",
    },
    {
      label: t("mode.replace"),
      value: "replace",
    },
    {
      label: t("mode.split"),
      value: "split",
    },
  ];
});


/**
 * 处理单位变化的函数
 */
const handleUnitChange = (): void => {
  // originField.value = undefined; // 重置原字段的值为undefined
  // targetField.value = undefined; // 重置目标字段的值为undefined
};

/**
 * 重置页面信息
 */
const handleReset = (): void => {
  errorMsg.value = "";
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
): Promise<string | null> => {
  const originFieldVar = await selectedField.getValue(recordId);
  if (originFieldVar === null) {
    return null;
  }
  let res: string | null = null;
  // 本身是 IDateTimeField || INumberField 类型
  if (
    originField.value?.type === FieldType.Number
  ) {
    res = originFieldVar.toString();
  } else if (originField.value?.type === FieldType.Text) {
    // 本身是 ITextField 类型
    if (Array.isArray(originFieldVar) && originFieldVar[0].type == "text") {
      res = originFieldVar[0].text;
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
  targetSelectField: ITextField,
  recordId: string,
  targetVal: string
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
    return;
  }

  return res;
};

const fomrValidate = () => {
  if (!(originField.value && targetField.value)) {
    return t("message.emptyField");
  }
  if (!activeTransformPattern.value.value.length) {
    return t("message.emptyMode");
  }
  if (!regexText.value.length) {
    return t("message.emptyRegex")
  }
  if (!isRegexValid(regexText.value)) {
    return t("message.wrongRegex");
  }
  return null
}

/**
 * 提交转换
 */
const handleConfirm = async () => {
  const msg = fomrValidate();
  if (msg) {
    errorMsg.value = msg;
    return;
  }
  handleReset();
  if (activeTable.value) {
    const recordIdList = await activeTable.value.getRecordIdList();
    const originSelectField = await activeTable.value.getField<SupportField>(
      originField.value!.id
    );
    const targetSelectField = await activeTable.value.getField<ITextField>(
      targetField.value!.id
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
          let targetVal = regexTranform(val, regexText.value);
          if (targetVal != undefined) {
            const proimse = setValueByRecordId(
            targetSelectField,
            recordId,
            targetVal
          );
          promises.push(proimse);
          }
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
 * 
 * @param originFieldText 源字段文本
 * @param regexExpression 正则表达式
 */
const regexTranform = (originFieldText: string, regexExpression: string, replaceText?: string ) => {
  const regex = new RegExp(regexExpression, "g");
  if (activeTransformPattern.value.value == "test") {
    console.log(regex)
    return regex.test(originFieldText) ? t("res.true") : t("res.false");
  }
  if (activeTransformPattern.value.value == "match") {
    const matches = originFieldText.match(regex);
    console.log(matches)
    return matches ? matches.join(" ") : "";
  }
  if (activeTransformPattern.value.value == "replace") {
    return originFieldText.replace(regex, replaceText || "")
  }
  if (activeTransformPattern.value.value == "split") {
    return originFieldText.split(regex).join(" ");
  }
}

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
 * 验证用户输入的字符串是否是合法的正则表达式
 * @param pattern 用户输入的字符串
 */
 const isRegexValid = (pattern: string) => {

    try {
      new RegExp(pattern);
      return true;
    } catch (error) {
      return false;
    }
  
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
      <div>
        <el-form-item>
          <template #label>
            <span style="display: flex; align-items: center">
              {{ t(`form.chooseOriginField`) }}
              <el-tooltip
                class="box-item"
                effect="dark"
                :content="t(`info.originField`)"
                placement="right"
              >
              <el-icon><WarningFilled /></el-icon>
              </el-tooltip>
            </span>
          </template>
          <el-select
            v-model="originField"
            value-key="id"
            class="m-2"
            :placeholder="t(`form.chooseOriginField`)"
            style="width: 90%; border-radius: 10px"
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
        </el-form-item>
        <el-form-item>
          <template #label>
            <span style="display: flex; align-items: center;">
              {{ t(`form.chooseTargetField`) }}
              <el-tooltip
                class="box-item"
                effect="dark"
                :content="t(`info.targetField`)"
                placement="right"
              >
              <el-icon><WarningFilled /></el-icon>
              </el-tooltip>
            </span>
          </template>
          <el-select
            v-model="targetField"
            value-key="id"
            class="m-2"
            :placeholder="t(`form.chooseTargetField`)"
            style="width: 90%"
          >
            <el-option
              v-for="item in fieldList.filter((item) => item.type === 1)"
              :key="item.id"
              :label="item.name"
              :value="item"
            />
          </el-select>
        </el-form-item>
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
        <el-form-item :label="t(`form.inputRegexText`)">
          <el-input
            v-model="regexText"
            :placeholder="t(`form.inputRegexText`)"
            clearable
            style="width: 90%"
          />
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
    <div v-if="errorMsg" style="padding-top: 20px; font-size: medium; width: 90%;">
      <el-alert :title="errorMsg" type="error" show-icon />
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
