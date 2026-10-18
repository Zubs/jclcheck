//MULTI    JOBGROUP
//A        GJOB
//B        GJOB
//           AFTER NAME=A,
//            WHEN=(RC=0)
//C        GJOB
//           AFTER NAME=A,
//            WHEN=(RC=4)
//D        GJOB
//           AFTER NAME=B
//           AFTER NAME=C
//MULTI    ENDGROUP
