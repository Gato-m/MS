/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string | object = string> {
      hrefInputParams: { pathname: Router.RelativePathString, params?: Router.UnknownInputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownInputParams } | { pathname: `/`; params?: Router.UnknownInputParams; } | { pathname: `/_sitemap`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}/events` | `/events`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}/info` | `/info`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}/map` | `/map`; params?: Router.UnknownInputParams; };
      hrefOutputParams: { pathname: Router.RelativePathString, params?: Router.UnknownOutputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownOutputParams } | { pathname: `/`; params?: Router.UnknownOutputParams; } | { pathname: `/_sitemap`; params?: Router.UnknownOutputParams; } | { pathname: `${'/(tabs)'}/events` | `/events`; params?: Router.UnknownOutputParams; } | { pathname: `${'/(tabs)'}/info` | `/info`; params?: Router.UnknownOutputParams; } | { pathname: `${'/(tabs)'}/map` | `/map`; params?: Router.UnknownOutputParams; };
      href: Router.RelativePathString | Router.ExternalPathString | `/${`?${string}` | `#${string}` | ''}` | `/_sitemap${`?${string}` | `#${string}` | ''}` | `${'/(tabs)'}/events${`?${string}` | `#${string}` | ''}` | `/events${`?${string}` | `#${string}` | ''}` | `${'/(tabs)'}/info${`?${string}` | `#${string}` | ''}` | `/info${`?${string}` | `#${string}` | ''}` | `${'/(tabs)'}/map${`?${string}` | `#${string}` | ''}` | `/map${`?${string}` | `#${string}` | ''}` | { pathname: Router.RelativePathString, params?: Router.UnknownInputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownInputParams } | { pathname: `/`; params?: Router.UnknownInputParams; } | { pathname: `/_sitemap`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}/events` | `/events`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}/info` | `/info`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}/map` | `/map`; params?: Router.UnknownInputParams; };
    }
  }
}
