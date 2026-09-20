import { RecipeEditor } from "./Editor"
import { RecipeList } from "./List"
import { ReviewModal } from "./Modal"
import { PreviewList } from "./Preview"
import { RecipeSidebar } from "./SideBar"

export const Recipe = {
  Editor: RecipeEditor,
  List: RecipeList,
  Modal: ReviewModal,
  SideBar: RecipeSidebar,
  Preview: PreviewList,
}

export { RecipeEditor, RecipeList, ReviewModal, RecipeSidebar, PreviewList }
