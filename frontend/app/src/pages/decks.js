import _ from "lodash";
import React, { Component } from "react";
import { withRouter, Redirect } from "react-router-dom";
import { connect } from "react-redux";
import { Container, Item, Loader } from "semantic-ui-react";
import uuid from "uuid/v4";

import DeckHeader from "../components/deck-header";
import DeckBody from "../components/deck-body";
import DeckComments from "../components/deck-comments";
import Study from "../components/deck-study";

import { receiveNotes } from "../actions/notes";
import { receiveDeck, fetchDeck } from "../actions/decks";
import { receiveContent, fetchContent } from "../actions/content";

import backend from "../backend";
import { getUser } from "../common";

// states:
//   not fetched => doesn't have key
//   fetching    => true
//   fetched     => obj
//   missing     => false
function toViewDeckProps(store, ownProps) {
  const slug = ownProps.slug;
  const deckId = store.decksBySlug.get(slug);
  const deck = deckId ? store.decks.get(deckId) : null;
  const content = deck ? store.content.get(deck.contentId) : null;
  return {
    bySlug: deckId,
    deck: deck,
    content: content
  };
}
export const ViewDeck = connect(toViewDeckProps)(
  class ViewDeck extends Component {
    constructor(props) {
      super(props);
      const { study, notes } = props;
      this.state = { editing: "", study, notes, selection: getUser().id };
      // console.log('ViewDeck Constructor', !!study, !!notes);
    }
    componentWillReceiveProps = nextProps => {
      // console.log('Will receive', nextProps);
      if (nextProps.study === undefined && nextProps.notes === undefined)
        this.setState({ study: false, notes: false });
      if (nextProps.study !== undefined)
        this.setState({ study: nextProps.study });
      if (nextProps.notes !== undefined)
        this.setState({ notes: nextProps.notes });
    };

    handleEdit = () => {
      this.setState({ editing: "deck" });
    };
    handleEditNotes = () => {
      this.setState({ editing: "notes" });
    };
    handleChange = deck => {
      this.setState({ deck });
    };
    handleSave = (content, audio) => {
      switch (this.state.editing) {
        case "deck": {
          const deck = this.state.deck || this.props.deck;
          const slug = deck.title;
          const slugs = _.uniq([slug].concat(deck.slugs));
          const contentId = uuid();

          backend.relay(receiveContent(contentId, content));
          backend.relay(
            receiveDeck({ ...deck, audioUrl: audio, slugs, contentId })
          );

          this.setState({ editing: "" });
          return;
        }
        case "notes": {
          const deck = this.state.deck || this.props.deck;
          const contentId = uuid();

          backend.relay(receiveContent(contentId, content));
          backend.relay(receiveNotes(getUser().id, deck.id, contentId));
          this.setState({ editing: "" });
          return;
        }
        default:
          return;
      }
    };
    handleDiscard = () => {
      this.bodyRef.initialize();
      this.setState({ editing: "", deck: undefined });
    };
    handleBodyRef = ref => (this.bodyRef = ref);

    componentDidMount() {
      if (_.isUndefined(this.props.bySlug)) {
        backend.relay(fetchDeck(this.props.slug));
      }
      if (_.isPlainObject(this.props.deck)) {
        if (_.isUndefined(this.props.content)) {
          backend.relay(fetchContent(this.props.deck.contentId));
        }
      }
    }
    componentDidUpdate() {
      // console.log('update', this.props.deck, this.props.content);
      if (this.props.bySlug === undefined) {
        backend.relay(fetchDeck(this.props.slug));
      }
      // console.log('update', this.props.deck, this.props.content);
      if (_.isPlainObject(this.props.deck)) {
        if (_.isUndefined(this.props.content)) {
          backend.relay(fetchContent(this.props.deck.contentId));
        }
      }
    }

    handleSelectionChange = selection => {
      this.setState({ selection });
    };

    studyQuitLink = () => {
      const deck = this.state.deck || this.props.deck;
      // const { notes } = this.state;
      return "/decks/" + deck.slugs[0] + "/";
    };

    render() {
      const { content } = this.props;
      const { editing, notes, study } = this.state;
      const deck = this.state.deck || this.props.deck;
      const hasDeck = _.isPlainObject(this.props.deck);
      const hasContent = _.isPlainObject(content);
      if (this.props.bySlug === "failed") return <Redirect to="/" />;
      if (!hasDeck) return <Loader active />;

      return (
        <div className={study ? "studying" : null}>
          <Container style={{ paddingTop: "2em" }}>
            <Item.Group>
              <DeckHeader
                deck={deck}
                editable={editing === "deck"}
                onEdit={this.handleEdit}
                onChange={this.handleChange}
                notesVisible={notes}
                mayEdit={!notes && !this.state.study}
              />
            </Item.Group>

            {hasContent ? (
              <DeckBody
                deck={deck}
                deckContent={this.props.content}
                selection={this.state.selection}
                onSelectionChange={this.handleSelectionChange}
                editDeck={editing === "deck"}
                editNotes={editing === "notes"}
                showAnnotations={this.state.notes}
                onEditNotes={this.handleEditNotes}
                onSave={this.handleSave}
                onDiscard={this.handleDiscard}
                ref={this.handleBodyRef}
              />
            ) : (
              <Loader active />
            )}

            {false && <DeckComments />}
          </Container>
          {study && (
            <Study studyQuitLink={this.studyQuitLink()} deckId={deck.id} />
          )}
        </div>
      );
    }
  }
);

function toNewDeckProps(store) {
  return {
    decks: store.decks
  };
}

const NewDeck = withRouter(
  connect(toNewDeckProps)(
    class NewDeck extends Component {
      state = {};
      onSave = (content, audio) => {
        const { deck } = this.state;
        const slug = deck.title;
        const contentId = uuid();
        const deckId = uuid();

        backend.relay(receiveContent(contentId, content));
        backend.relay(
          receiveDeck({
            ...deck,
            id: deckId,
            audioUrl: audio,
            slugs: [slug],
            contentId,
            nLikes: 0,
            nComments: 0,
            dirty: true,
            processing: true,
            hidden: false,
            createdAt: new Date()
          })
        );

        this.props.history.push("/decks/" + deckId);
      };
      handleChange = deck => {
        this.setState({ deck });
      };
      handleBodyRef = ref => (this.bodyRef = ref);

      render = () => {
        const deck = this.state.deck || { title: "", tags: [] };
        return (
          <div>
            <Container style={{ paddingTop: "2em" }}>
              <Item.Group>
                <DeckHeader
                  deck={deck}
                  onChange={this.handleChange}
                  mayEdit={true}
                  editable={true}
                />
              </Item.Group>
              <DeckBody
                deck={deck}
                ref={this.handleBodyRef}
                editDeck={true}
                showAnnotations={false}
                onSave={this.onSave}
              />
            </Container>
          </div>
        );
      };
    }
  )
);

export { NewDeck };
