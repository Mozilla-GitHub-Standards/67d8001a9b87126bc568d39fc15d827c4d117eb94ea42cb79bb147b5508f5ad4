import { hot } from 'react-hot-loader';
import React from 'react';
import PropTypes from 'prop-types';
import { BrowserRouter, Switch, Route } from 'react-router-dom';
import { withStyles } from '@material-ui/core/styles';
import ErrorPanel from '@mozilla-frontend-infra/components/ErrorPanel';
import Spinner from '@mozilla-frontend-infra/components/Spinner';

import Main from '../views/Main';
import PropsRoute from '../components/PropsRoute';
import AuthController from '../components/auth/AuthController';
import CredentialsMenu from '../views/CredentialsMenu';
import NotFound from '../components/NotFound';
import Auth0Login from '../views/Auth0Login';

const styles = () => ({
  container: {
    fontFamily: 'Roboto',
  },
  '@global': {
    body: {
      margin: 0,
    },
  },
});

class App extends React.Component {
  static propTypes = {
    classes: PropTypes.shape({}).isRequired,
  };

  /* TODO: decouple auth from App */
  static childContextTypes = {
    authController: PropTypes.object.isRequired,
  };

  state = {
    error: undefined,
  };

  constructor(props) {
    super(props);
    this.authController = new AuthController();
    this.state = {
      authReady: false,
    };
  }

  getChildContext() {
    return {
      authController: this.authController,
    };
  }

  componentWillUnmount() {
    this.authController.removeListener(
      'user-session-changed',
      this.handleUserSessionChanged,
    );
  }

  handleUserSessionChanged = (userSession) => {
    // Consider auth "ready" when we have no userSession, a userSession with no
    // renewAfter, or a renewAfter that is not in the past.  Once auth is
    // ready, it never becomes non-ready again.
    // eslint-disable-next-line react/destructuring-assignment
    const authReady = this.state.authReady
      || !userSession
      || !userSession.renewAfter
      || new Date(userSession.renewAfter) > new Date();

    this.setState({ authReady });
  };

  // eslint-disable-next-line camelcase
  UNSAFE_componentWillMount() {
    this.authController.on(
      'user-session-changed',
      this.handleUserSessionChanged,
    );

    // we do not want to automatically load a user session on the login views; this is
    // a hack until they get an entry point of their own with no UI.
    if (!window.location.pathname.startsWith('/login')) {
      this.authController.loadUserSession();
    } else {
      this.setState({ authReady: true });
    }
  }


  render() {
    const { authReady } = this.state;
    const { authController } = this;
    const { error } = this.state;

    return (
      <BrowserRouter>
        <div>
          {error && <ErrorPanel error={new Error(error)} />}
          <PropsRoute component={CredentialsMenu} />
          {authReady ? (
            <Switch>
              <PropsRoute path="/" exact component={Main} />
              <PropsRoute
                path="/login"
                component={Auth0Login}
                setUserSession={authController.setUserSession}
              />
              <Route component={NotFound} />
            </Switch>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <Spinner />
            </div>
          )}
        </div>
      </BrowserRouter>
    );
  }
}

export default hot(module)(withStyles(styles)(App));
