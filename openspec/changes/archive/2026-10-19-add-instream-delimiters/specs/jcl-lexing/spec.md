# Spec Delta

## ADDED Requirements

### Requirement: Delimiter values
`DLM=` SHALL be accepted on DD statements. Its value SHALL be exactly two characters: letters, digits and `$ # @` written as they are, or any two characters in quotes, with `''` standing for one quote. Any other value SHALL get a `JCLS011` warning at the value's column, and the data SHALL then end as if no `DLM=` were given.

#### Scenario: Valid delimiters
- **WHEN** `DLM=@@`, `DLM=$$` or `DLM='%%'` is used on `DD *`
- **THEN** no diagnostic is reported for the value

#### Scenario: Invalid delimiters
- **WHEN** `DLM=@`, `DLM=@@@` or `DLM=` is used
- **THEN** `JCLS011` is reported at the value's column

### Requirement: Data ends at its delimiter
With a valid `DLM=`, in-stream data SHALL end only at a line that starts in column 1 with the delimiter, and `/*` and `//` lines SHALL be data. Without one, `DD *` data SHALL end at `/*` in columns 1–2 followed by a blank or the end of the line, or at the next `//` statement; `DD DATA` data SHALL end only at such a `/*`.

#### Scenario: Empty data
- **WHEN** `DD *` is followed directly by `/*`
- **THEN** the DD has an empty in-stream data block and no diagnostics are reported

#### Scenario: Nick's item 15
- **WHEN** `//SYSUT1 DD *,DLM=@@` is followed by `LINE ONE`, `/* NOT THE END` and `@@`
- **THEN** no diagnostics are reported, and the data holds both lines

#### Scenario: Delimiter must start in column 1
- **WHEN** a data line is ` @@` (starting in column 2) under `DLM=@@`
- **THEN** it is data, and the data ends at the next line starting `@@`

#### Scenario: Two delimiters in one step
- **WHEN** two DDs in a step use `DLM=@@` and `DLM=$$`
- **THEN** each ends at its own delimiter

#### Scenario: Slash-star data line with DLM
- **WHEN** a `/*` data line appears under `DLM=$$`
- **THEN** it is not reported as a statement and gets no `JCLL001`

#### Scenario: Slash-star comment ends default data
- **WHEN** `DD *` data is followed by `/* END OF DATA`
- **THEN** the data ends there

#### Scenario: DD DATA keeps JCL lines
- **WHEN** `DD DATA` data contains a `//` line and then `/*`
- **THEN** the `//` line is data and not a statement

#### Scenario: SORT card containing slash-star
- **WHEN** a `DD *,DLM=$$` block holds a SORT control card containing `/*` and ends with `$$`
- **THEN** the job checks clean

### Requirement: Missing delimiter
When `DD DATA` data or data with a valid `DLM=` reaches the end of the file without its delimiter, one `JCLL006` warning naming the delimiter SHALL be reported on the DD statement's line, and no diagnostics SHALL be reported on the data lines.

#### Scenario: Missing @@
- **WHEN** `DD *,DLM=@@` data runs to the end of the file
- **THEN** one `JCLL006` warning names `@@`

#### Scenario: DD star at end of file
- **WHEN** `DD *` data without `DLM=` runs to the end of the file
- **THEN** no `JCLL006` is reported

### Requirement: DLM without in-stream data
`DLM=` on a DD that has no in-stream data SHALL get a `JCLK006` warning at the keyword's column saying it has no effect.

#### Scenario: DLM on a dataset DD
- **WHEN** `//IN DD DSN=A.B,DISP=SHR,DLM=@@` is checked
- **THEN** `JCLK006` is reported at the `DLM` keyword
