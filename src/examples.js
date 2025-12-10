// Example Tiny-C programs for the web interpreter

export const examples = {
  hello: {
    title: "Hello World",
    code: `/* Hello World - Tiny-C */

pl "Hello, World!"
pl "Welcome to Tiny-C Web Interpreter!"
pl ""
pl "This interpreter supports:"
ps "- Print functions: "
pl "ps, pl, pn"
ps "- Variables: "
pl "int a, b, c"
ps "- Input: "
pl "getnum"
`
  },
  
  simple: {
    title: "Simple Print",
    code: `/* Simple Print Examples */

pl "Line 1: First message"
pl "Line 2: Second message"  
pl "Line 3: Third message"
pl ""
ps "Print without newline: "
ps "more text "
pl "and finish the line"
`
  },
  
  variables: {
    title: "Variables",
    code: `/* Variables and Math */

a = 10
b = 20
c = a + b

pl "Variable Operations:"
ps "a = "
pn a
pl ""
ps "b = "
pn b
pl ""
ps "c = a + b = "
pn c
pl ""
`
  },
  
  math: {
    title: "Math Operations",
    code: `/* Math Calculations */

x = 15
y = 7

pl "Math operations:"
pl ""

result = x + y
ps "15 + 7 = "
pn result
pl ""

result = x - y
ps "15 - 7 = "
pn result
pl ""

result = x * 2
ps "15 * 2 = "
pn result
pl ""
`
  },
  
  interactive: {
    title: "Interactive Input",
    code: `/* Interactive Program */

pl "Welcome to Tiny-C!"
pl "This program asks for your age"
pl ""

age = getnum("Enter your age:")

ps "You are"
pn age
pl " years old"

year = 2025 - age
ps "You were born around"
pn year
pl ""

pl "Thanks for using Tiny-C!"
`
  },
  
  countdown: {
    title: "Number Countdown",
    code: `/* Countdown Program */

pl "Let's count down!"
pl ""

n = getnum("Enter a number to count down from:")

ps "Counting down from"
pn n
pl "..."
pl ""

pl "Done! (Full loop support coming soon)"
`
  },
  
  info: {
    title: "About Tiny-C",
    code: `/* About Tiny-C Web Interpreter */

pl "================================"
pl "  TINY-C WEB INTERPRETER"
pl "================================"
pl ""
pl "Original tiny-c Interpreter"
pl "Copyright (c) 1984 by Scott B. Guthery"
pl ""
pl "Web Port - December 2025"
pl "JavaScript + React Implementation"
pl ""
pl "Currently Supported:"
pl "- Print functions: ps, pl, pn"
pl "- Variables: name = value"
pl "- Math expressions: +, -, *, /"
pl "- Interactive input: getnum"
pl ""
pl "Coming Soon:"
pl "- Full tiny-c syntax with []"
pl "- Functions and procedures"
pl "- Control flow: if, while, for"
pl "- Arrays and pointers"
pl ""
pl "This is a simplified interpreter"
pl "for educational purposes"
`
  },
  
  trek: {
    title: "Star Trek Game",
    code: `/* Trek Test - Testing control flow */

int seed, i, j, sum

testif int n [
 if (n > 50) [
  pr "Number is greater than 50"
  return 1
 ] else [
  pr "Number is 50 or less"
  return 0
 ]
]

testloop [
 pr "Testing while loop:"
 i = 0
 while (i < 5) [
  ps "  Count: "
  pn i
  pl ""
  i = i + 1
 ]
]

testfor [
 pr "Testing for loop:"
 sum = 0
 for (i = 1; i <= 10; i = i + 1) [
  sum = sum + i
 ]
 ps "Sum of 1 to 10: "
 pn sum
 pl ""
]

main [
 pr "StarTrek Game Test"
 pr "=================="
 pr ""
 
 seed = getnum("Enter seed number [0..100]")
 
 ps "Seed set to: "
 pn seed
 pl ""
 
 pr "Testing random function..."
 i = random(100)
 ps "Random number (1-100): "
 pn i
 pl ""
 
 pr "Testing if/else with function..."
 j = testif(i)
 ps "Result: "
 pn j
 pl ""
 
 testloop()
 pl ""
 
 testfor()
 pl ""
 
 pr "All tests complete!"
 pr "Check browser console for debug output"
]
`
  },
  
  trek: {
    title: "Star Trek Game",
    code: `
/* trek.tc - eld - 6/23/17 */

int a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, r, s, t, u, v, w, x, y
int z(175)
int seed

/* Prints a string followed by a newline
pr char b(0) [
 ps b
 MC 13,1;MC 10,1
]

abs int nn [
 if (nn >= 0)
  return nn
 return -nn
]

/* returns a number between 1 and range, inclusive
random int range [
 int temp

 seed = seed * 1103515245 + 12345
 temp = (seed / 65536)

 if (temp == 0) [
  temp = seed
  if (temp < 0) temp = -temp
  return temp % range + 1
 ]
 if (temp < 0) temp = -temp
 return temp % range + 1
]

/* int to ascii, in buf (right justified), width of buf, num to convert, return len of numeric part
itoa char buf(0); int width, num [
 int sign, len
 len = width
 if (num < 0) [
  num = -num
 ]
 buf(width) = 0
 while (num >= 10) [
  buf(--width) = (num % 10) + '0'
  num = num / 10
 ]
 buf(--width) = num + '0'

 if (sign < 0)
  buf(--width) = '-'

 len = len - width

 while (width != 0)
  buf(--width) = ' '
]

/* print num right justified, in a field of width
pnf int num, width [
 char buf(20)
 int len, p

 len = itoa(buf, 20, num)
 p = 20 - width
 ps(buf + p)
]

getcmd char prompt(0) [
 char reply(5)
 int ll

 while (1) [
  ps(prompt)
  ll = gs(reply)
  if (ll > 0)
   return reply(0)
 ]
]

getnum char prompt(0) [
 ps(prompt)
 return gn
]

show_cmds [
 pr ""
 pr "r=Report       s=SR. sensor   l=LR. sensor"
 pr "g=Galaxy map   p=Phaser       t=Torpedo"
 pr "w=Warp engine  h=Help         q=Quit"
 pr ""
]

get_course [
 i = getnum("course (0-360):")
 if ((i > 360) + (i < 0)) [
  r = 0
  return
 ]
 s = (i + 45) / 90
 i = i - s * 90
 r = (45 + i * i) / 110 + 45
 if (s == 1) [
  s = i
  t = 45
 ] else if (s == 2) [
  s = 45
  t = -i
 ] else if (s == 3) [
  s = -i
  t = -45
 ] else [
  s = -45
  t = i
 ]
]

docked [
 e = 4000
 f = 10
 o = 1
 for (i = 64; i <= 70; ++i)
  z(i) = 0
]

L165 [
 do [
  s = random(8)
  t = random(8)
  a = 8 * s + t + 62
 ] while (z(a))
 z(a) = i
]

show_pos [
 ps("Enterprise in q-"); pnf(u, 1); pnf(v, 1); ps(" s-"); pnf(x, 1); pnf(y, 1); pr("")
]

klngn_hit [
 ps("Klingon at s-"); pnf(z(m + 6), 1); pnf(z(m + 12), 1)
 z(m) = z(m) - s
 if (z(m) > 0) [
  pr(" **damaged**")
  return
 ]
 z(m) = 0
 i = 8 * u + v - 9
 j = z(i) / abs(z(i))
 z(i) = z(i) - 100 * j
 --k
 i = 8 * z(m + 6) + z(m + 12) + 62
 z(i) = 0
 --n
 pr(" ***destroyed***")
]

chk_damage [
 i = z(j + 63)
 if      (j == 1) ps("Short range sensor")
 else if (j == 2) ps("Computer display")
 else if (j == 3) ps("Long range sensor")
 else if (j == 4) ps("Phaser")
 else if (j == 5) ps("Warp engine")
 else if (j == 6) ps("Photon torpedo tubes")
 else if (j == 7) ps("Shield")
 if (i) [
  ps(" damaged, "); pn(i); pr(" stardates estimated for repair")
 ]
]

chk_docked [
 for (i = x - (x > 1); i <= x + (x < 8); ++i) [
  for (j = y - (y > 1); j <= y + (y < 8); ++j) [
   if (z(8 * i + j + 62) == 2) [
    if (!o)
     pr("Sulu: 'Captain, we are docked at Starbase.'")
    docked()
    return
   ]
  ]
 ]
 o = 0
]

lr_sensor [
 show_pos()
 j = 3
 chk_damage()
 if (i) return
 pr("")
 for (i = u - 1; i <= u + 1; ++i) [
  for (j = v - 1; j <= v + 1; ++j) [
   m = 8 * i + j - 9
   a = 0
   if ((i > 0) * (i < 9) * (j > 0) * (j < 9)) [
    a = abs(z(m))
    z(m) = a
   ]
   pnf(a, 4);
  ]
  pr("")
 ]
]

chk_overload [
 if (a > 1090) [
  pr("...overloaded..")
  j = 4
  z(67) = 1
  a = 9
  chk_damage()
 ]
 i = z(m + 6) - x
 j = z(m + 12) - y
 s = a * 30 / (30 + i * i + j * j) + 1
]

damaged [
 if (!z(70)) [
  z(70) = random(t / 50 + 1)
  j = 7
  chk_damage()
  return
 ]
 j = random(6)
 z(j + 63) = random(t / 99 + 1) + z(j + 63)
 i = random(8) + 1
 c = c + i
 ps("McCoy: 'Sickbay to bridge, we suffered "); pn(i); pr(" casualties.'")
 chk_damage()
]

klngn_attact [
 if (!n)
  return
 pr("Klingon attack")
 if (o) [
  pr("Starbase protects Enterprise")
  return
 ]
 t = 0
 for (m = 135; m <= 140; ++m) [
  if (z(m)) [
   a = (z(m) + random(z(m))) / 2
   chk_overload()
   t = t + s
   i = z(m + 6)
   j = z(m + 12)
   pnf(s, 3); ps(" units hit from Klingon at s-"); pnf(i, 1); pnf(j, 1); pr("");
  ]
 ]

 e = e - t
 if (e <= 0) [
  pr("*** bang ***")
  return
 ]
 pn(e); pr(" units of energy left.")
 if (random(e / 4) > t)
  return
 damaged()
]

chk_game_over [
 chk_docked()
 klngn_attact()
 if (!k) [
  pr(""); pr("Mission accomplished.")
  if (d < 3)
   pr("Boy, you barely made it.")
  if (d > 5) [
   pr("Good work...")
   if (d > 9) [
    pr("Fantastic!")
    if (d > 13)
     pr("Unbelievable!")
   ]
  ]
  d = 30 - d
  i = h * 100 / d * 10
  pn(h); ps(" Klingons in "); pn(d); ps(" stardates. ("); pn(i); pr(")");
  j = 100 * (!c) - 5 * c
  pn(c); ps(" casualties incurred. ("); pn(j); pr(")");
  ps("Your score: "); pn(i + j); pr("");
 ] else if (d < 0)
  pr("It's too late, the federation has been conquered.")
]

L45 [
 for (i = 71; i <= 152; ++i)
  z(i) = 0
 z(8 * x + y + 62) = 4
 m = abs(z(8 * u + v - 9))
 n = m / 100
 i = 1
 if (n) [
  for (j = 1; j <= n; ++j) [
   L165()
   z(j + 134) = 300
   z(j + 140) = s
   z(j + 146) = t
  ]
 ]

 show_pos()
 m = m - 100 * n
 i = 2
 if (m / 10)
  L165()
 m = m - m / 10 * 10
 i = 3
 if (m)
  for (j = 1; j <= m; ++j)
   L165()
 chk_game_over()
]

L40 [
 u = random(8)
 v = random(8)
 x = random(8)
 y = random(8)
 L45()
]

galaxy_map [
 show_pos()
 j = 2
 chk_damage()
 if (i)
  return
 pr(" of galaxy map")
 for (i = 0; i <= 7; ++i) [
  pr(""); pnf(i + 1, 1); ps(":")
  for (j = 0; j <= 7; ++j) [
   m = z(8 * i + j)
   pnf((m > 0) * m, 4)
  ]
  pr("")
 ]
 ps("  ")
 for (i = 0; i <= 7; ++i)
  ps("  ..")
 pl("  ")
 for (i = 1; i <= 8; ++i)
  pnf(i, 4);
 pr(""); pr("");
]

sr_sensor [
 show_pos()
 j = 1
 chk_damage()
 if (i)
  return
 m = 8 * u + v - 9
 z(m) = abs(z(m))
 pr("")
 for (i = 1; i <= 8; ++i) [
  pnf(i, 1);
  for (j = 1; j <= 8; ++j) [
   m = z(8 * i + j + 62)
   if      (m == 0) ps(" .")
   else if (m == 1) ps(" K")
   else if (m == 2) ps(" B")
   else if (m == 3) ps(" *")
   else if (m == 4) ps(" E")
  ]
  pr("")
 ]
 ps(" ")
 for (i = 1; i <= 8; ++i)
  pnf(i, 2)
 pr("")
]

phasers [
 j = 4
 chk_damage()
 if (i)
  return
 a = getnum(" energized. Units to fire:")
 if (a < 1)
  return
 if (a > e) [
  ps("Spock: 'We have only "); pn(e); pr(" units.'")
  return
 ]
 e = e - a
 if (n < 1) [
  pr("Phaser fired at empty space.")
  chk_game_over()
  return
 ]
 a = a / n
 for (m = 135; m <= 140; ++m) [
  if (z(m)) [
   chk_overload()
   pnf(s, 3); ps(" units hit ")
   klngn_hit()
  ]
 ]
 chk_game_over()
]

status_report [
 pr("Status report:")
 ps("stardate "); pnf(3230 - d, 10); pr("")
 ps("time left "); pnf(d, 7); pr("")
 ps("Condition   ")
 if (o)
  pr("Docked")
 else if (n)
  pr("Red")
 else if (e < 999)
  pr("Yellow")
 else
  pr("Green")
 ps("position    q-"); pnf(u, 1); pnf(v, 1); ps("s-"); pnf(x, 1); pnf(y, 1); pr("");
 ps("energy "); pnf(e, 12); pr("")
 ps("torpedoes "); pnf(f, 7); pr("")
 ps("Klingons left "); pnf(k, 3); pr("")
 ps("Starbases "); pnf(b, 6); pr("")
 for (j = 1; j <= 7; ++j)
  if (z(j + 63))
   chk_damage()
]

L525 [
 z(8 * x + y + 62) = 4
 show_pos()
 chk_game_over()
]

L521 [
 pr("**Emergency stop**")
 pr("Spock: 'To err is human.'")
 L525()
]

L530 [
 p = u * 72 + p / 5 + w / 5 * s / r - 9
 u = p / 72
 g = v * 72 + g / 5 + w / 5 * t / r - 9
 v = g / 72
 if (random(9) < 2) [
  pr("***Space storm***")
  t = 100
  damaged()
 ]
 if ((u > 0) * (u < 9) * (v > 0) * (v < 9)) [
  x = (p + 9 - 72 * u) / 9
  y = (g + 9 - 72 * v) / 9
  L45()
  return
 ]
 pr("**You wandered outside the galaxy**")
 pr("On board computer takes over, and saved your life")
 L40()
]

warp [
 j = 5
 chk_damage()
 if (!i)
  pr("")
 for (;;) [
  w = getnum("sector distance:")
  if (w < 1)
   return
  if (!(i * (w > 2)))
   break
  pr("Chekov: 'We can try 2 at most, sir.'")
 ]
 if (w > 91) [
  w = 91
  pr("Spock: 'Are you sure, Captain?'")
 ]
 if (e < w * w / 2) [
  pr("Scotty: 'Sir, we do not have the energy.'")
  return
 ]
 get_course()
 if (!r)
  return
 --d
 e = e - w * w / 2
 z(8 * x + y + 62) = 0
 for (m = 64; m <= 70; ++m)
  z(m) = (z(m) - 1) * (z(m) > 0)
 p = 45 * x + 22
 g = 45 * y + 22
 w = 45 * w

 for (m = 1; m <= 8; ++m) [
  w = w - r
  if (w < -22) [
   L525()
   return
  ]
  p = p + s
  g = g + t
  i = p / 45
  j = g / 45
  if ((i < 1) + (i > 8) + (j < 1) + (j > 8)) [
   L530()
   return
  ]
  if (z(8 * i + j + 62)) [
   L521()
   return
  ]
  x = i
  y = j
 ]
 L521()
]

L590 [
 s=random(99)+280
 for (m=135; m <= 140; ++m) [
  if ((z(m+6)==i)*(z(m+12)==j))
   klngn_hit()
 ]
 chk_game_over()
]

starbase_dstryd [
 b=b-1
 z(l) = 0
 z(w) = z(w)-10*r
 pr("Starbase destroyed")
 pr("Spock: 'I often find human behaviour fascinating.'")
 chk_game_over()
]

radiation [
 t=300
 pr("It novas    ***Radiation alarm***")
 damaged()
 chk_game_over()
]

star_dstryd [
 z(l) = 0
 z(w) = z(w)-r
 if (random(9)<6) [
  pr("Star destroyed")
  chk_game_over()
  return
 ]
 radiation()
]

hit_star [
 pr("Hit a star")
 if (random(9)<3) [
  pr("Torpedo absorbed")
  chk_game_over()
  return
 ]
 star_dstryd()
]

torpedos [
 j=6
 chk_damage()
 if (i)
  return
 if (f==0) [
  pr(" empty")
  return
 ]
 pr(" loaded")
 get_course()
 if (r==0)
  return
 ps("torpedo track ")
 f=f-1
 p=45*x+22
 g=45*y+22

 for (m=1; m <= 8; ++m) [
  p=p+s
  g=g+t
  i=p/45
  j=g/45
  if ((i<1)+(i>8)+(j<1)+(j>8) == 0) [
   l=8*i+j+62
   w=8*u+v-9
   r=z(w)/abs(z(w))
   pnf(i, 1); pn(j); ps(" ")
   if (z(l) == 1) [
    L590()
    return
   ]
   if (z(l) == 2) [
    starbase_dstryd()
    return
   ]
   if (z(l) == 3) [
    hit_star()
    return
   ]
   if (z(l) == 4) [
    star_dstryd()
    return
   ]
   if (z(l) == 5) [
    radiation()
    return
   ]
  ]
 ]
 pr("...missed")
 chk_game_over()
]

main [
 int cc

 pr("StarTrek")
 if (version() < 7) [pr ("Requires version 7 or higher"); exit]
 do [
  seed = getnum("Enter seed number [0..100]")
  if ((seed < 0) + (seed > 100)) seed = 100

  y = 2999
  if (getcmd("Do you want a difficult game? (y or n):") == 'y')
   y = 999
  pl("Stardate 3200:  your mission is ")
  do [
   k = b = 0
   d = 30
   for (i = 0; i <= 63; ++i) [
    j = random(99) < 5
    b = b + j
    m = random(y)
    m = (m < 209) + (m < 99) + (m < 49) + (m < 24) + (m < 9) + (m < 2)
    k = k + m
    z(i) = -100 * m - 10 * j - random(8)
   ]
  ] while ((b < 2) + (k < 4))

  ps("to destroy "); pn(k); pr(" Klingons in 30 stardates.")
  ps("There are "); pn(b); pr(" Starbases."); pr("")
  docked()
  c = 0
  h = k
  L40()

  show_cmds()
  while ((e >= 0) * (d >= 0)) [
   cc = getcmd("Captain? ")
   if (cc == 'g') galaxy_map()
   else if (cc == 'l') lr_sensor()
   else if (cc == 's') sr_sensor()
   else if (cc == 'p') phasers()
   else if (cc == 'r') status_report()
   else if (cc == 'w') warp()
   else if (cc == 't') torpedos()
   else if (cc == 'q') break
   else show_cmds()
  ]

  if (e <= 0) [
   pr("Enterprise destroyed")
   if (h - k > 9)
    pr("But you were a good man")
  ]
  pr("")
 ] while (getcmd("Another game? (y or n):") == 'y')

 pr("Good bye.")
]
`
  }
};

export default examples;
