# DMU-Net.org - STEP to ThreeJS - Batch Converter

[![License: CC BY-SA 4.0](https://img.shields.io/badge/License-CC%20BY--SA%204.0-lightgrey.svg)](http://creativecommons.org/licenses/by-sa/4.0/)

Official Repository for the website https://www.dmu-net.org

## Project Architecture
- Branch **[Master](https://github.com/DEKHTIARJonathan/dmu-net.org)**: The DMU-Net website
- Branch **[STEP-2-ThreeJS-BatchConverter](https://github.com/DEKHTIARJonathan/dmu-net.org/tree/STEP-2-ThreeJS-BatchConverter)**: The batch script used to convert STEP Files to ThreeJS readable files.

## Branch Description

This script aims to provide an automated batch script to convert a large number of STEP Files into ThreeJS JSON Files that can be embedded in a website for preview.

The Repository is organised as followed:

- **web**: contains an example of a webpage displaying a converted STEP CAD model into ThreeJS.
- **converter**: contains the batch script that needs to be executed to convert CAD Files readable by the ThreeJS WebGL Library.

## Installation

Please follow these steps in order to install the projects dependencies:

1. Download and Install Anaconda Python Distribution (Python 3.6): [Download Here](https://www.continuum.io/downloads)
2. Execute in a *command prompt* the given commands (you made need administrator rights):
```shell
conda install -y -c dlr-sc freeimageplus=3.17.0 gl2ps=1.3.8 tbb=4.3.6
conda install -y -c conda-forge freetype=2.7
conda install -y -c pythonocc -c oce pythonocc-core=0.17.3 python=3
```

## WebViewer Preview 

The results can be previewed with the webpage available under the **web/** folder. It should work perfectly when served from a webserver with any modern web browser. However, it might not work locally with Google Chrome due to Cross Origin Policies. We recommend using Mozilla Firefox, when used locally.

## Launch the batch processing

1. Add some STEP files in the folder converter/data following the given organisation
```
├── converter
|   ├── data
|       ├── ClassNameA
|           ├── random_name_01.step
|           ├── ...
|           └── random_name_0x.step
|       ├── ClassNameB
|           ├── random_name_01.step
|           ├── ...
|           └── random_name_0x.step
|       ├── ...
|           ├── random_name_01.step
|           ├── ...
|           └── random_name_0x.step
|           
|       └── ClassNameD
|           ├── random_name_01.step
|           ├── ...
|           └── random_name_0x.step
```
2. Execute the given command in a command prompt located in the folder **converter**: `python batch_processing.py`
3. Launch the conversion by following the given screenshot:
![Batch Converter Screenshot - Launch Command](/app_screenshot.jpg?raw=true "Application Screenshot")

## Cite This Work
*DEKHTIAR Jonathan, DURUPT Alexandre, BRICOGNE Matthieu, EYNARD Benoit, ROWSON Harvey and KIRITSIS Dimitris* (2017).
Deep Machine Learning for Big Data Engineering Applications - Survey, Opportunities and Case Study.
```
@article {DEKHTIAR2017:DMUNet,
    author = {DEKHTIAR, Jonathan and DURUPT, Alexandre and BRICOGNE, Matthieu and EYNARD, Benoit and ROWSON, Harvey and KIRITSIS, Dimitris},
    title  = {Deep Machine Learning for Big Data Engineering Applications - Survey, Opportunities and Case Study},
    month  = {jan},
    year   = {2017}
}
```

## Open Source Licence - Creative Commons:

### You are free to:

- **Share** — copy and redistribute the material in any medium or format
- **Adapt** — remix, transform, and build upon the material for any purpose, even commercially.

*The licensor cannot revoke these freedoms as long as you follow the license terms.*

### Under the following terms:

- **Attribution** — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.
- **ShareAlike** — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.
 - **No additional restrictions** — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.

## Maintainer

* **Lead Developer:** Jonathan DEKHTIAR
* **Contact:** [contact@jonathandekhtiar.eu](mailto:contact@jonathandekhtiar.eu)
* **Twitter:** [@born2data](https://twitter.com/born2data)
* **LinkedIn:** [JonathanDEKHTIAR](https://fr.linkedin.com/in/jonathandekhtiar)
* **Personal Website:** [JonathanDEKHTIAR](http://www.jonathandekhtiar.eu)
* **RSS Feed:** [FeedCrunch.io](https://www.feedcrunch.io/@dataradar/)
* **Tech. Blog:** [born2data.com](http://www.born2data.com/)
* **Github:** [DEKHTIARJonathan](https://github.com/DEKHTIARJonathan)

## Contacts

* **Jonathan DEKHTIAR:** [contact@jonathandekhtiar.eu](mailto:contact@jonathandekhtiar.eu)
* **Alexandre DURUPT:** [alexandre.durupt@utc.fr](mailto:alexandre.durupt@utc.fr)
* **Matthieu BRICOGNE:** [matthieu.bricogne@utc.fr](mailto:matthieu.bricogne@utc.fr)
* **Benoit EYNARD:** [benoit.eynard@utc.fr](mailto:benoit.eynard@utc.fr)
* **Harvey ROWSON:** [rowson@deltacad.fr](mailto:rowson@deltacad.fr)
* **Dimitris KIRITSIS:** [dimitris.kiritsis@epfl.ch](mailto:dimitris.kiritsis@epfl.ch)

## Special Acknowledgement

This work has been possible thanks to the support of [Thomas Paviot - @tpaviot](https://github.com/tpaviot) and his wonderful Python Library [PythonOCC](https://github.com/tpaviot/pythonocc-core).
