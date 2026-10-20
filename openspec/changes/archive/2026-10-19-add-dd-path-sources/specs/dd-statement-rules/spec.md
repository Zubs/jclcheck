# Spec Delta

## ADDED Requirements

### Requirement: UNIX file keywords
DD statements SHALL accept `PATH` (an absolute path of up to 255 characters), `PATHOPTS` (one or more open options), `PATHMODE` (one or more permission names), `PATHDISP` (up to two of KEEP and DELETE) and `FILEDATA` (BINARY, TEXT or RECORD). A value that breaks its rule SHALL get `JCLS009`.

#### Scenario: Nick's item 19
- **WHEN** `//DD1  DD  PATH='/usr/applics/pay.time',PATHOPTS=ORDONLY` is checked
- **THEN** no diagnostics are reported

#### Scenario: All the path keywords
- **WHEN** a DD has PATH with `PATHOPTS=(OWRONLY,OCREAT,OTRUNC)`, `PATHMODE=(SIRUSR,SIWUSR)`, `PATHDISP=(KEEP,DELETE)` and `FILEDATA=TEXT`
- **THEN** no diagnostics are reported

#### Scenario: Path length and form
- **WHEN** paths of 255 and 256 characters, and the relative path `pay.time`, are checked
- **THEN** the first is accepted and the other two get `JCLS009`

#### Scenario: BPXBATCH job
- **WHEN** a BPXBATCH step sends STDOUT and STDERR to UNIX files with PATH, PATHOPTS and PATHMODE
- **THEN** the job checks clean

### Requirement: Path conflicts
`PATH` with `DSN`, `SYSOUT` or `DUMMY` SHALL get `JCLD003` naming both. `DISP` with `PATH` SHALL get `JCLD006`. More than one of ORDONLY, OWRONLY and ORDWR in `PATHOPTS` SHALL get `JCLD005`. `PATHOPTS`, `PATHMODE` or `PATHDISP` without `PATH` SHALL get a `JCLD007` warning.

#### Scenario: PATH and DSN
- **WHEN** a DD has both PATH and DSN
- **THEN** `JCLD003` names DSN and PATH

#### Scenario: Two access modes
- **WHEN** `PATHOPTS=(ORDONLY,OWRONLY)` is checked
- **THEN** `JCLD005` is reported

#### Scenario: Options without PATH
- **WHEN** `PATHOPTS=ORDONLY` is used on a DD with DSN and no PATH
- **THEN** `JCLD007` is reported

#### Scenario: DISP with PATH
- **WHEN** a DD has PATH and DISP=SHR
- **THEN** `JCLD006` suggests PATHDISP

### Requirement: More data sources
`PATH`, `SUBSYS` and `DDNAME` SHALL count as data sources, and a DD with `SPACE=` and no DSN SHALL count as a new temporary dataset, so none of them gets `JCLD002`. A DD with no data source and no SPACE SHALL still get `JCLD002`.

#### Scenario: Valid DDs without DSN
- **WHEN** `//T DD UNIT=SYSDA,SPACE=(TRK,1)`, `//T DD SUBSYS=(BLSR,DDNAME=X)` and `//T DD DDNAME=SYSIN` are checked
- **THEN** none gets `JCLD002`

#### Scenario: Still missing
- **WHEN** `//T DD DISP=SHR` is checked
- **THEN** `JCLD002` is reported
