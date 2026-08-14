import { Injectable } from "@nestjs/common";

import type { AnalysisResult } from "../domain/contracts/analysis-result.contract.js";
import {
  AnalysisResultAggregator,
  type AnalysisResultAggregationInput
} from "../domain/results/analysis-result-aggregator.js";

@Injectable()
export class AnalysisResultAggregationService {
  private readonly aggregator = new AnalysisResultAggregator();

  aggregate(input: AnalysisResultAggregationInput): AnalysisResult {
    return this.aggregator.aggregate(input);
  }
}
