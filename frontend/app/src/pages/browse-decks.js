import _ from "lodash";
import React, { Component } from "react";
import { connect } from "react-redux";
import { Container, Item, Visibility, Loader } from "semantic-ui-react";

import Footer from "../components/footer";
import DeckHeader from "../components/deck-header";
import { fetchSearchResults } from "../actions/search";
import backend from "../backend";

const toProps = store => {
  return {
    decks: store.decks,
    search: store.search
  };
};

const BrowseDecks = connect(toProps)(
  class BrowseDecks extends Component {
    constructor(props) {
      super(props);
      const isReactSnap = navigator.userAgent === "ReactSnap";
      this.state = { rendered: isReactSnap ? 100 : 10 };
    }
    componentDidMount = () => {
      this.lazySearchFetch();
    };
    componentDidUpdate = () => {
      this.lazySearchFetch();
      // Trigger a resize event such that enough rows are fetched to fill the entire screen.
      window.dispatchEvent(new Event("resize"));
    };

    lazySearchFetch = () => {
      const { search, order } = this.props;
      const { rendered } = this.state;
      const nFetched = search.fetched.length;

      const invalidSearch = search.order !== order;

      if (invalidSearch) {
        this.setState({ rendered: 5 });
        backend.relay(fetchSearchResults(search.query, order, 0));
      } else if (nFetched < rendered + 5 && search.status === "partial") {
        backend.relay(fetchSearchResults(search.query, order, nFetched));
      }
    };

    fetchMoreRows = () => {
      const { search } = this.props;
      const { rendered } = this.state;
      const done =
        rendered >= search.fetched.length && search.status === "completed";
      if (!done) {
        this.setState(state => {
          return { rendered: state.rendered + 5 };
        });
      }
    };

    render = () => {
      const { decks, search } = this.props;
      const { rendered } = this.state;
      const toBeRendered = _.take(search.fetched, rendered);
      const done =
        rendered >= search.fetched.length && search.status === "completed";

      return [
        <Container key="container" style={{ paddingTop: "2em" }}>
          <Visibility
            once={false}
            fireOnMount={true}
            onBottomVisible={this.fetchMoreRows}
          >
            <Item.Group divided>
              {toBeRendered.map(id => (
                <DeckHeader key={id} deck={decks.get(id)} />
              ))}
            </Item.Group>
          </Visibility>
          <Loader inline="centered" active={!done} />
        </Container>,
        done && <Footer key="footer" />
      ];
    };
  }
);

export default BrowseDecks;
