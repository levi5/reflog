import type { BlameLine } from "../../domain/entities/blame/blame"
import { blameParserUseCase } from "../factories/use-cases/blame-factory"

export const parseBlamePorcelain = (output: string): BlameLine[] => blameParserUseCase.parse(output)
