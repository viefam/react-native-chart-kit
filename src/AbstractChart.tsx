import React, { Component } from "react";
import { Defs, Line, LinearGradient, Stop, Text } from "react-native-svg";

import { ChartConfig, Dataset, PartialBy } from "./HelperTypes";

export interface AbstractChartProps {
  fromZero?: boolean;
  fromNumber?: number;
  chartConfig?: AbstractChartConfig;
  yAxisLabel?: string;
  yAxisSuffix?: string;
  yLabelsOffset?: number;
  yAxisInterval?: number;
  xAxisLabel?: string;
  xLabelsOffset?: number;
  hidePointsAtIndex?: number[];
}

export interface AbstractChartConfig extends ChartConfig {
  count?: number;
  data?: Dataset[];
  dataX?: Dataset[];
  width?: number;
  height?: number;
  paddingTop?: number;
  paddingRight?: number;
  horizontalLabelRotation?: number;
  formatYLabel?: (yLabel: string) => string;
  labels?: string[];
  horizontalOffset?: number;
  stackedBar?: boolean;
  verticalLabelRotation?: number;
  formatXLabel?: (xLabel: string) => string;
  verticalLabelsHeightPercentage?: number;
}

export type AbstractChartState = {};

export const DEFAULT_X_LABELS_HEIGHT_PERCENTAGE = 0.75;
const labelTextColor= "#2D001A"
class AbstractChart<
  IProps extends AbstractChartProps,
  IState extends AbstractChartState
> extends Component<AbstractChartProps & IProps, AbstractChartState & IState> {
  calcScaler = (data: number[]) => {
    if (this.props.fromZero) {
      // tinh toan gia tri lon nhat lam tron 
      let count = Math.min(...data) === Math.max(...data) ? 1 : 4;
      const maxValue = Math.max(...data,0)
      const averageValue = Math.round(maxValue/count);
      const tenCount = Math.pow(10, `${averageValue}`.length - 1)
      const averageValueData = Math.ceil(averageValue/tenCount)  * tenCount
      let maxValueData = averageValueData * count 
      //check lại nếu làm tròn thừa
      const distance = (maxValueData - maxValue)/averageValueData
      if(distance> 1) maxValueData = maxValueData - Math.floor(distance) * averageValueData
      return maxValueData - Math.min(...data, 0) || 1;
    } else if (this.props.fromNumber) {
      return (
        Math.max(...data, this.props.fromNumber) -
          Math.min(...data, this.props.fromNumber) || 1
      );
    } else {
      return Math.max(...data) - Math.min(...data) || 1;
    }
  };

  calcBaseHeight = (data: number[], height: number) => {
    const min = Math.min(...data);
    const max = Math.max(...data);
    if (min >= 0 && max >= 0) {
      return height;
    } else if (min < 0 && max <= 0) {
      return 0;
    } else if (min < 0 && max > 0) {
      return (height * max) / this.calcScaler(data);
    }
  };

  calcHeight = (val: number, data: number[], height: number) => {
    const max = Math.max(...data);
    const min = Math.min(...data);

    if (min < 0 && max > 0) {
      return height * (val / this.calcScaler(data));
    } else if (min >= 0 && max >= 0) {
      return this.props.fromZero
        ? height * (val / this.calcScaler(data))
        : height * ((val - min) / this.calcScaler(data));
    } else if (min < 0 && max <= 0) {
      return this.props.fromZero
        ? height * (val / this.calcScaler(data))
        : height * ((val - max) / this.calcScaler(data));
    }
  };

  getPropsForBackgroundLines() {
    const { propsForBackgroundLines = {},gridLineColor } = this.props.chartConfig;
    return {
      stroke: gridLineColor,
      strokeWidth: 1,
      ...propsForBackgroundLines
    };
  }

  getPropsForLabels() {
    const {
      propsForLabels = {},
      color,
    } = this.props.chartConfig;
    return {
      fontSize: 12,
      fill: labelTextColor,
      ...propsForLabels
    };
  }

  getPropsForVerticalLabels() {
    const {
      propsForVerticalLabels = {},
      color,
    } = this.props.chartConfig;
    return {
      fill: labelTextColor,
      fontSize: 12,
      ...propsForVerticalLabels
    };
  }

  getPropsForHorizontalLabels() {
    const {
      propsForHorizontalLabels = {},
      color,
    } = this.props.chartConfig;
    return {
      fill: labelTextColor,
      ...propsForHorizontalLabels
    };
  }

  renderHorizontalLines = config => {
    const {
      count,
      width,
      height,
      paddingTop,
      paddingRight,
      verticalLabelsHeightPercentage = DEFAULT_X_LABELS_HEIGHT_PERCENTAGE
    } = config;
    const basePosition = height * verticalLabelsHeightPercentage;

    return [...new Array(count + 1)].map((_, i) => {
      const y = (basePosition / count) * i + paddingTop;
      return (
        <Line
          key={Math.random()}
          x1={paddingRight}
          y1={y}
          x2={width}
          y2={y}
          {...this.getPropsForBackgroundLines()}
        />
      );
    });
  };

  renderHorizontalLine = config => {
    const {
      width,
      height,
      paddingTop,
      paddingRight,
      verticalLabelsHeightPercentage = DEFAULT_X_LABELS_HEIGHT_PERCENTAGE
    } = config;
    return (
      <Line
        key={Math.random()}
        x1={paddingRight}
        y1={height * verticalLabelsHeightPercentage + paddingTop}
        x2={width}
        y2={height * verticalLabelsHeightPercentage + paddingTop}
        {...this.getPropsForBackgroundLines()}
      />
    );
  };

  renderHorizontalLabels = (
    config: Omit<AbstractChartConfig, "data"> & { data: number[] }
  ) => {
    const {
      count,
      data,
      height,
      paddingTop,
      paddingRight,
      horizontalLabelRotation = 0,
      decimalPlaces = 2,
      formatYLabel = (yLabel: string) => yLabel,
      verticalLabelsHeightPercentage = DEFAULT_X_LABELS_HEIGHT_PERCENTAGE
    } = config;

    const {
      yAxisLabel = "",
      yAxisSuffix = "",
      yLabelsOffset = 12
    } = this.props;
    return new Array(count === 1 ? 1 : count + 1).fill(1).map((_, i) => {
      let yLabel = String(i * count);

      if (count === 1) {
        yLabel = `${yAxisLabel}${formatYLabel(
          Number(data[0]).toFixed(decimalPlaces)
        )}${yAxisSuffix}`;
      } else {
        //convert to K or M unit
        const kZeroCount = 3;
        const mZeroCount = 6;
        const minValue = this.calcScaler(data) / count;
        let resultZeroCount=  0;
        let zeroUnit = ""
        if(minValue / Math.pow(10,mZeroCount) > 1){
          //convert To M
          resultZeroCount = mZeroCount
          zeroUnit = "m"
        } else{
          if(minValue / Math.pow(10,kZeroCount) > 1){
            //convert To M
            resultZeroCount = kZeroCount
            zeroUnit = "k"
          }
        }

        const label = this.props.fromZero
          ? (this.calcScaler(data) / (count*Math.pow(10,resultZeroCount))) * i + Math.min(...data, 0)
          : (this.calcScaler(data) / (count*Math.pow(10,resultZeroCount))) * i + Math.min(...data);
        yLabel = `${yAxisLabel}${formatYLabel(
          label.toFixed(decimalPlaces)
        )}${yAxisSuffix}${label !== 0 ? zeroUnit :""}`;
      }

      const basePosition = height * verticalLabelsHeightPercentage;
      const x = paddingRight - yLabelsOffset;
      const y =
        count === 1 && this.props.fromZero
          ? paddingTop + 4
          : height * verticalLabelsHeightPercentage -
            (basePosition / count) * i +
            paddingTop + 4 ;
      return (
        <Text
          rotation={horizontalLabelRotation}
          origin={`${x}, ${y}`}
          key={Math.random()}
          x={x}
          textAnchor="end"
          y={y}
          {...this.getPropsForLabels()}
          {...this.getPropsForHorizontalLabels()}
        >
          {yLabel}
        </Text>
      );
    });
  };

  renderVerticalLabels = ({
    labels = [],
    width,
    height,
    paddingRight,
    paddingTop,
    horizontalOffset = 0,
    stackedBar = false,
    verticalLabelRotation = 0,
    formatXLabel = xLabel => xLabel,
    verticalLabelsHeightPercentage = DEFAULT_X_LABELS_HEIGHT_PERCENTAGE
  }: Pick<
    AbstractChartConfig,
    | "labels"
    | "width"
    | "height"
    | "paddingRight"
    | "paddingTop"
    | "horizontalOffset"
    | "stackedBar"
    | "verticalLabelRotation"
    | "formatXLabel"
    | "verticalLabelsHeightPercentage"
  >) => {
    const {
      xAxisLabel = "",
      xLabelsOffset = 0,
      hidePointsAtIndex = []
    } = this.props;
    const fontSize = 12;

    let fac = 1;
    if (stackedBar) {
      fac = 0.71;
    }

    return labels.map((label, i) => {
      if (hidePointsAtIndex.includes(i)) {
        return null;
      }

      let x =
      labels.length > 1 ?  (((width - paddingRight) / (labels.length-1)) * i +
          paddingRight +
          horizontalOffset) *
        fac : 0;
      const y =
        height * verticalLabelsHeightPercentage +
        paddingTop +
        fontSize * 2 +
        xLabelsOffset;

      return (
        <Text
          origin={`${x}, ${y}`}
          rotation={verticalLabelRotation}
          key={Math.random()}
          x={x}
          y={y}
          textAnchor={verticalLabelRotation === 0 ? "middle" : "start"}
          {...this.getPropsForLabels()}
          {...this.getPropsForVerticalLabels()}
        >
          {`${formatXLabel(label)}${xAxisLabel}`}
        </Text>
      );
    });
  };

  renderVerticalLines = ({
    data,
    width,
    height,
    paddingTop,
    paddingRight,
    verticalLabelsHeightPercentage = DEFAULT_X_LABELS_HEIGHT_PERCENTAGE
  }: Omit<
    Pick<
      AbstractChartConfig,
      | "data"
      | "width"
      | "height"
      | "paddingRight"
      | "paddingTop"
      | "verticalLabelsHeightPercentage"
    >,
    "data"
  > & { data: number[] }) => {
    const { yAxisInterval = 1 } = this.props;
    // add -1 for the first vertical line
    return [0,100].map(
      (_, i) => {
        const cx = paddingRight + ( _/100 * (width - paddingRight));
         
        return (
          <Line
            key={Math.random()}
            x1={cx}
            y1={paddingTop}
            x2={cx}
            y2={height * verticalLabelsHeightPercentage + paddingTop}
            {...this.getPropsForBackgroundLines()}
          />
        );
      }
    );
  };

  renderVerticalLine = ({
    height,
    paddingTop,
    paddingRight,
    verticalLabelsHeightPercentage = DEFAULT_X_LABELS_HEIGHT_PERCENTAGE
  }: Pick<
    AbstractChartConfig,
    "height" | "paddingRight" | "paddingTop" | "verticalLabelsHeightPercentage"
  >) => (
    <Line
      key={Math.random()}
      x1={Math.floor(paddingRight)}
      y1={0}
      x2={Math.floor(paddingRight)}
      y2={height * verticalLabelsHeightPercentage + paddingTop}
      {...this.getPropsForBackgroundLines()}
    />
  );

  renderDefs = (
    config: Pick<
      PartialBy<
        AbstractChartConfig,
        | "backgroundGradientFromOpacity"
        | "backgroundGradientToOpacity"
        | "fillShadowGradient"
        | "fillShadowGradientOpacity"
      >,
      | "width"
      | "height"
      | "backgroundGradientFrom"
      | "backgroundGradientTo"
      | "useShadowColorFromDataset"
      | "data"
      | "backgroundGradientFromOpacity"
      | "backgroundGradientToOpacity"
      | "fillShadowGradient"
      | "fillShadowGradientOpacity"
    >
  ) => {
    const {
      width,
      height,
      backgroundGradientFrom,
      backgroundGradientTo,
      useShadowColorFromDataset,
      data
    } = config;

    const fromOpacity = config.hasOwnProperty("backgroundGradientFromOpacity")
      ? config.backgroundGradientFromOpacity
      : 1.0;
    const toOpacity = config.hasOwnProperty("backgroundGradientToOpacity")
      ? config.backgroundGradientToOpacity
      : 1.0;

    const fillShadowGradient = config.hasOwnProperty("fillShadowGradient")
      ? config.fillShadowGradient
      : this.props.chartConfig.color(1.0);

    const fillShadowGradientOpacity = config.hasOwnProperty(
      "fillShadowGradientOpacity"
    )
      ? config.fillShadowGradientOpacity
      : 0.1;

    return (
      <Defs>
        <LinearGradient
          id="backgroundGradient"
          x1={0}
          y1={height}
          x2={width}
          y2={0}
          gradientUnits="userSpaceOnUse"
        >
          <Stop
            offset="0"
            stopColor={backgroundGradientFrom}
            stopOpacity={fromOpacity}
          />
          <Stop
            offset="1"
            stopColor={backgroundGradientTo}
            stopOpacity={toOpacity}
          />
        </LinearGradient>
        {useShadowColorFromDataset ? (
          data.map((dataset, index) => (
            <LinearGradient
              id={`fillShadowGradient_${index}`}
              key={`${index}`}
              x1={0}
              y1={0}
              x2={0}
              y2={height}
              gradientUnits="userSpaceOnUse"
            >
              <Stop
                offset="0"
                stopColor={
                  dataset.color ? dataset.color(1.0) : fillShadowGradient
                }
                stopOpacity={fillShadowGradientOpacity}
              />
              <Stop
                offset="1"
                stopColor={
                  dataset.color
                    ? dataset.color(fillShadowGradientOpacity)
                    : fillShadowGradient
                }
                stopOpacity="0"
              />
            </LinearGradient>
          ))
        ) : (
          <LinearGradient
            id="fillShadowGradient"
            x1={0}
            y1={0}
            x2={0}
            y2={height}
            gradientUnits="userSpaceOnUse"
          >
            <Stop
              offset="0"
              stopColor={fillShadowGradient}
              stopOpacity={fillShadowGradientOpacity}
            />
            <Stop offset="1" stopColor={fillShadowGradient} stopOpacity="0" />
          </LinearGradient>
        )}
      </Defs>
    );
  };
}

export default AbstractChart;
