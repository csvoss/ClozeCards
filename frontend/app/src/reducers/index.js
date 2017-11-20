import { combineReducers } from "redux";
import content from "./content";
import decks from "./decks";
import decksBySlug from "./decksBySlug";
import user from "./user";
import cards from "./cards";
import search from "./search";
import notes from "./notes";

export default combineReducers({
  decks,
  decksBySlug,
  content,
  user,
  cards,
  search,
  notes
});