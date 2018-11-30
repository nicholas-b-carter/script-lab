import React, { Component } from 'react';
import { editorUrls, getCurrentEnv } from '../../constants';

const LOCAL_STORAGE_POLLING_INTERVAL = 1000; // ms
const URL = editorUrls[getCurrentEnv()];
const HEARTBEAT_HTML_URL = `${URL}/heartbeat.html`;
const GET_ACTIVE_SOLUTION_REQUEST_MESSAGE = 'GET_ACTIVE_SOLUTION';

export interface IProps {
  host: string;
  onReceiveNewActiveSolution: (solution: ISolution | null) => void;
}

interface IState {
  activeSolution?: ISolution | null;
}

class Heartbeat extends Component<IProps, IState> {
  node;
  pollingInterval;
  state;

  constructor(props) {
    super(props);
    this.node = React.createRef();
    this.state = { activeSolutionId: undefined };
  }

  componentDidMount() {
    this.pollingInterval = setInterval(() => {
      this.requestActiveSolution();
    }, LOCAL_STORAGE_POLLING_INTERVAL);

    window.onmessage = this.onWindowMessage;
  }

  componentWillUnmount() {
    clearInterval(this.pollingInterval);
    window.onmessage = null;
  }

  private requestActiveSolution = () => {
    if (this.node.current) {
      this.node.current.contentWindow!.postMessage(
        `${GET_ACTIVE_SOLUTION_REQUEST_MESSAGE}/${this.props.host}`,
        URL,
      );
    }
  };

  private onWindowMessage = ({ origin, data }) => {
    if (origin !== URL) {
      return;
    }

    try {
      const solution: ISolution | null = JSON.parse(data);
      if (this.checkIfSolutionChanged(solution)) {
        this.setState({ activeSolution: solution });
        this.props.onReceiveNewActiveSolution(solution);
      }
    } catch (err) {
      console.error(err);
    }
  };

  render() {
    return (
      <iframe style={{ display: 'none' }} src={HEARTBEAT_HTML_URL} ref={this.node} />
    );
  }

  // helpers

  private checkIfSolutionChanged(solution: ISolution | null) {
    // If I didn't have a solution before, but do now, things changed
    if (!this.state.activeSolution && solution) {
      return true;
    }

    // if the solution was undefined initially, and got an explicit null,
    // tell the parent that I got a null from the heartbeat and hence pass it on to show a message
    // to the user that no solution was found:
    if (this.state.activeSolution === undefined && solution === null) {
      return true;
    }

    // Note: by this point, this.state.activeSolution is going to be defined,
    // or else it would have been caught by the preceding if statements.

    if (solution) {
      // if the solution's id is different than the current solution ID, it's a new solution!
      if (solution.id !== this.state.activeSolution.id) {
        return true;
      }

      if (solution.dateLastModified > this.state.activeSolution.dateLastModified) {
        return true;
      }
    }

    // Otherwise
    return false;
  }
}

export default Heartbeat;