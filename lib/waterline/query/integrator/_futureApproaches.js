/*
Thoughts:

sends (join table)

Option A
============================================================
  | message_id | to    | cc     | bcc
============================================================
  | 30         | 1     | null   | null
  | 30         | null  | 1      | null



Named associations could be treated as implicit `through` attributes:


Option B
============================================================
  | message_id | user_id | to    | cc     | bcc
============================================================
  | 30         | 1       | true  | false  | false
  | 30         | 1       | false | true  | false



OR even more simply, a single implicit enum attribute:


Option C
========================================================================
  | _message_id | _user_id | _message_relationship | _user_relationship
========================================================================
  | 30          | 1        | 'to'                  | null
  | 30          | 1        | 'cc'                  | null
  | 30          | 1        | 'bcc'                 | null


*/