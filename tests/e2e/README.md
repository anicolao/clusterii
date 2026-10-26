# Numbered illustrated features

[Cluster E2E guide](../../E2E_GUIDE.md) defines real acknowledged actions, ordered generated stories and exact independently reviewed references. This directory begins scoped migration to the inspected Pantheon feature organization; it does not claim the entire historical browser suite already complies.

- [008 Fleet travel and recorded arrivals](008-fleet-travel/README.md)
- [009 Selected history and confirmed removal](009-selected-history/README.md)

`helpers/` owns the shared fixture and step implementation. Historical import files only re-export these implementations; remaining shared utilities are reused without forks. Each migrated feature owns its index, fidelity review, generated story namespace and screenshot namespace. No failed or unexecuted story is published as a passing walkthrough.
