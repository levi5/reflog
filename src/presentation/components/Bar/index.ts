import { AppBar } from "./App"
import { AppBrand } from "../Brand"
import { BusyBar } from "./Busy"
import { RepoBar } from "./Repo"
import { StatusBar } from "./Status"
import { VisualizeBar } from "./Visualize"

export const Bar = {
  App: AppBar,
  Brand: AppBrand,
  Busy: BusyBar,
  Status: StatusBar,
  Repo: RepoBar,
  Visualize: VisualizeBar,
}

export { AppBar, AppBrand, BusyBar, RepoBar, StatusBar }
