Title: Article One
Description: Test Article
TOC: First Article

This is a test

```html
<div>test<div>
```

<pre class="prettyprint other"><code>
{{#escapehtml}}<div>
  <div>test</div>
</div>{{/escapehtml}}
</code></pre>


In any case if we compute the cross product of our <span class="z-axis">`zAxis`</span> and
<span style="color: gray;">`up`</span> we'll get the <span class="x-axis">xAxis</span> for the camera.

And now that we have the <span class="x-axis">`xAxis`</span> we can cross the <span class="z-axis">`zAxis`</span> and the <span class="x-axis">`xAxis`</span>
which will give us the camera's <span class="y-axis">`yAxis`</span>

Now all we have to do is plug the 3 axes into a matrix. That gives us a
matrix that will orient something that points at the `target` from the
`cameraPosition`. We just need to add in the `position`

<div class="webgl_math_center"><pre class="webgl_math">
+----+----+----+----+
| <span class="x-axis">Xx</span> | <span class="x-axis">Xy</span> | <span class="x-axis">Xz</span> |  0 |  <- <span class="x-axis">x axis</span>
+----+----+----+----+
| <span class="y-axis">Yx</span> | <span class="y-axis">Yy</span> | <span class="y-axis">Yz</span> |  0 |  <- <span class="y-axis">y axis</span>
+----+----+----+----+
| <span class="z-axis">Zx</span> | <span class="z-axis">Zy</span> | <span class="z-axis">Zz</span> |  0 |  <- <span class="z-axis">z axis</span>
+----+----+----+----+
| Tx | Ty | Tz |  1 |  <- camera position
+----+----+----+----+
</pre></div>

Here's the code to compute the cross product of 2 vectors.

```js
function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1],
          a[2] * b[0] - a[0] * b[2],
          a[0] * b[1] - a[1] * b[0]];
}
```

Here's the code to subtract two vectors.