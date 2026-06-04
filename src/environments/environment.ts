// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  // TODO: provided by the project owner. Use the public anon key only.
  // Never place a Supabase service-role key in client code.
  supabaseUrl: 'https://trqqhmvdakjdsvqtbpxa.supabase.co', // e.g. 'https://YOUR-PROJECT.supabase.co'
  supabaseAnonKey: 'sb_publishable_L6uthxBbhuLzQX3IF9LXYQ_s2ElJs63', // e.g. 'eyJhbGciOi...'
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
