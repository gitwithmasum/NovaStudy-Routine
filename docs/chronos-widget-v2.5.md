# Archived: NovaStudy × Masum-Chronos v2.5 integration

**Status: retired in NovaStudy v3.6.5 to keep the two apps separate.**

The v2.5 integration previously embedded optional Focus Timer and read-only Stats widgets inside NovaStudy. It has now been removed from NovaStudy's active HTML, runtime imports, offline asset cache, and regression suite. NovaStudy no longer loads the Chronos widget publisher script or sends a study snapshot to Chronos.

This retirement affects only the optional frontend integration. It does **not** remove NovaStudy academic data, NovaStudy authentication, or the existing `chronos_missions`, `chronos_preferences`, and `chronos_backups` tables from Supabase. No Supabase schema/table deletion is part of this release.

The standalone apps remain available independently:

- NovaStudy-Routine: https://gitwithmasum.github.io/NovaStudy-Routine/
- Masum-Chronos: https://gitwithmasum.github.io/Masum-Chronos/

If an old home-screen shortcut opens the wrong app, uninstall that shortcut and reinstall from the intended app's canonical URL. See the app-isolation section in the main README for the PWA recovery steps.
