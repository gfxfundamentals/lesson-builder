# GFXFundamentals Lesson Builder

This is the lesson builder (static site genertor) used on
[WebGLFundamentals](https://webglfundamentals.org),
[WebGL2Fundamentals](https://webgl2fundamentals.org), and
[ThreeJSFundamentals](https://threejsfundamentals.org).

The code is a mess as it started small and got hacked over time.

Still, I got tired of propragating changes between projects so
I managed to get it separated out.

I'm not sure it has any features over something like Jeckyll except

1. it's written in JavaScript.

   I'm not saying Ruby is bad. Only that
I really only want to have to mantain one dev environment.

   I particularly like that npm defaults to all dependencies being local.
No knowledge needed. In special incantations. It just works.
My, very limited experiecne with
Ruby is that Ruby expects many things to be globally installed
and you have to use other tools to help you make things local.

2. I think, but I'm probably wrong, that it handles HTML better.

   My markdown files have lots of embedded HTML. For whatever
reason most of time I try this in other systems they get confused
and end up seeing markdown inside portions of HTML. I probably
just don't know how to use them correctly.

3. It handles multiple languages

   I'm sure other systems do that too but it's not a common request
so I'm guessing that's often less supported.

Anyway, I'm not trying to promote this as a solution to anything.
It's just what I have hacked together over the years to make
the sites listed above.


